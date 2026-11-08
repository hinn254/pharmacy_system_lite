"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertCanMutateInventory } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { batchDeleteSchema, batchFormSchema } from "@/lib/validations/batch";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { captureServerEvent } from "@/lib/analytics/server";
import { countBucket } from "@/lib/analytics/events";

export async function listBatches() {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  return prisma.drugBatch.findMany({
    where: { organizationId: session.user.organizationId, deletedAt: null },
    orderBy: [{ expiryDate: "asc" }],
    include: {
      drug: {
        select: {
          genericName: true,
          internalCode: true,
          reorderLevel: true,
          categories: {
            include: { category: { select: { id: true, name: true, slug: true } } },
          },
        },
      },
      supplier: true,
    },
  });
}

export async function upsertBatch(input: unknown, id?: string) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  assertCanMutateInventory(session.user.role);
  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const raw = batchFormSchema.parse(input);
  const data = {
    ...raw,
    expiryDate: new Date(raw.expiryDate + "T12:00:00"),
  };

  const drug = await prisma.drug.findFirst({
    where: { id: data.drugId, organizationId: orgId },
  });
  if (!drug) throw new Error("Invalid drug");

  const unitCost =
    data.unitCost != null ? new Prisma.Decimal(data.unitCost) : null;

  if (id) {
    const existing = await prisma.drugBatch.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new Error("Batch not found");
    if (existing.deletedAt) throw new Error("This batch has been deleted.");
    const delta = data.quantityOnHand - existing.quantityOnHand;
    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.drugBatch.update({
        where: { id },
        data: {
          batchNumber: data.batchNumber,
          expiryDate: data.expiryDate,
          quantityOnHand: data.quantityOnHand,
          supplierId: data.supplierId || null,
          purchaseRef: data.purchaseRef || null,
          unitCost,
        },
      });
      if (delta !== 0) {
        await tx.stockMovement.create({
          data: {
            organizationId: orgId,
            type: "ADJUSTMENT",
            drugId: data.drugId,
            batchId: id,
            quantity: delta,
            reason: "Batch quantity adjustment",
            createdById: userId,
          },
        });
      }
      return b;
    });
    await writeAuditLog({
      organizationId: orgId,
      userId,
      action: "batch.update",
      entityType: "DrugBatch",
      entityId: id,
    });
    revalidatePath("/inventory/batches");
    revalidatePath("/pos");
    revalidatePath("/dashboard");
    return updated;
  }

  const created = await prisma.$transaction(async (tx) => {
    const b = await tx.drugBatch.create({
      data: {
        organizationId: orgId,
        drugId: data.drugId,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
        quantityOnHand: data.quantityOnHand,
        supplierId: data.supplierId || null,
        purchaseRef: data.purchaseRef || null,
        unitCost,
      },
    });
    await tx.stockMovement.create({
      data: {
        organizationId: orgId,
        type: "RECEIPT",
        drugId: data.drugId,
        batchId: b.id,
        quantity: data.quantityOnHand,
        reason: "Initial receipt",
        createdById: userId,
      },
    });
    return b;
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "batch.create",
    entityType: "DrugBatch",
    entityId: created.id,
  });
  await captureServerEvent(
    { organizationId: orgId, userId, userRole: session.user.role },
    "stock_batch_received",
    { item_count_bucket: countBucket(data.quantityOnHand) },
  );
  revalidatePath("/inventory/batches");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return created;
}

export async function softDeleteBatch(batchId: string, raw: unknown) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  assertCanMutateInventory(session.user.role);
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const { reason } = batchDeleteSchema.parse(raw);

  const batch = await prisma.drugBatch.findFirst({
    where: { id: batchId, organizationId: orgId },
    select: {
      id: true,
      deletedAt: true,
      quantityOnHand: true,
      drug: { select: { id: true, genericName: true } },
    },
  });
  if (!batch) throw new Error("Batch not found");
  if (batch.deletedAt) return;

  await prisma.$transaction(async (tx) => {
    await tx.drugBatch.update({
      where: { id: batchId },
      data: {
        deletedAt: new Date(),
        deletedReason: reason,
        deletedById: userId,
        quantityOnHand: 0,
      },
    });

    await tx.stockMovement.create({
      data: {
        organizationId: orgId,
        type: "ADJUSTMENT",
        drugId: batch.drug.id,
        batchId,
        // Ensure it is removed from POS immediately.
        quantity: -batch.quantityOnHand,
        reason: `Batch removed from POS (soft delete): ${reason}`,
        createdById: userId,
      },
    });
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "batch.soft_delete",
    entityType: "DrugBatch",
    entityId: batchId,
    metadata: { reason },
  });

  revalidatePath("/inventory/batches");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
}

export async function purgeSoftDeletedBatches(days = 30) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const safeDays = Math.min(Math.max(Math.floor(days), 1), 365);
  const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const candidates = await prisma.drugBatch.findMany({
    where: {
      organizationId: orgId,
      deletedAt: { not: null, lt: cutoff },
    },
    select: { id: true },
    take: 500,
  });
  if (candidates.length === 0) return { deleted: 0 };

  // Avoid deleting batches referenced by sales allocations (FK restrict).
  const ids = candidates.map((c) => c.id);
  const referenced = await prisma.saleLineBatch.findMany({
    where: { batchId: { in: ids } },
    select: { batchId: true },
  });
  const referencedSet = new Set(referenced.map((r) => r.batchId));
  const deletableIds = ids.filter((id) => !referencedSet.has(id));
  if (deletableIds.length === 0) return { deleted: 0 };

  const res = await prisma.drugBatch.deleteMany({
    where: { organizationId: orgId, id: { in: deletableIds } },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "batch.purge",
    entityType: "DrugBatch",
    entityId: null,
    metadata: { days: safeDays, deleted: res.count },
  });

  revalidatePath("/inventory/batches");
  revalidatePath("/dashboard");
  return { deleted: res.count };
}

export async function listDeletedBatches(limit = 200) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") return [];
  const orgId = session.user.organizationId;
  const take = Math.min(Math.max(Math.floor(limit), 1), 500);

  return prisma.drugBatch.findMany({
    where: { organizationId: orgId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take,
    include: {
      drug: { select: { genericName: true, internalCode: true } },
      deletedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function restoreDeletedBatch(batchId: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const batch = await prisma.drugBatch.findFirst({
    where: { id: batchId, organizationId: orgId },
    select: {
      id: true,
      deletedAt: true,
      deletedReason: true,
      drugId: true,
    },
  });
  if (!batch) throw new Error("Batch not found");
  if (!batch.deletedAt) return;

  await prisma.drugBatch.update({
    where: { id: batchId },
    data: {
      deletedAt: null,
      deletedReason: null,
      deletedById: null,
    },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "batch.restore",
    entityType: "DrugBatch",
    entityId: batchId,
    metadata: { priorReason: batch.deletedReason ?? null },
  });

  revalidatePath("/inventory/batches");
  revalidatePath("/admin/deleted-batches");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
}
