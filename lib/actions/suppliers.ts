"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertCanMutateInventory } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { supplierInputSchema } from "@/lib/validations/supplier";

function normalizeSupplierPayload(data: {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  speciality?: string | null;
}) {
  return {
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    address: data.address?.trim() || null,
    speciality: data.speciality?.trim() || null,
  };
}

export async function listSuppliersAction() {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  return prisma.supplier.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(input: unknown) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  assertCanMutateInventory(session.user.role);
  const orgId = session.user.organizationId;
  const data = supplierInputSchema.parse(input);
  const payload = normalizeSupplierPayload(data);
  const s = await prisma.supplier.create({
    data: {
      organizationId: orgId,
      ...payload,
    },
  });
  revalidatePath("/inventory/batches");
  revalidatePath("/admin/suppliers");
  return s;
}

export async function upsertSupplier(input: unknown, id?: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const data = supplierInputSchema.parse(input);
  const payload = normalizeSupplierPayload(data);

  if (id) {
    const existing = await prisma.supplier.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new Error("Not found");
    const updated = await prisma.supplier.update({
      where: { id },
      data: payload,
    });
    await writeAuditLog({
      organizationId: orgId,
      userId,
      action: "supplier.update",
      entityType: "Supplier",
      entityId: id,
    });
    revalidatePath("/admin/suppliers");
    revalidatePath("/inventory/batches");
    return updated;
  }

  const created = await prisma.supplier.create({
    data: { ...payload, organizationId: orgId },
  });
  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "supplier.create",
    entityType: "Supplier",
    entityId: created.id,
  });
  revalidatePath("/admin/suppliers");
  revalidatePath("/inventory/batches");
  return created;
}
