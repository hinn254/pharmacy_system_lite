"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertCanMutateInventory } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { drugFormSchema } from "@/lib/validations/drug";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import {
  drugIsDda,
} from "@/lib/controlled-drug-categories";
import { getDdaCategorySetForOrg } from "@/lib/org-controlled-drug-categories";

export type PosBatchForDrug = {
  batchNumber: string;
  expiryDate: string; // ISO
  quantityOnHand: number;
};

export type PosCategoryForDrug = {
  id: string;
  name: string;
  slug: string;
};

export type DrugForPos = {
  id: string;
  genericName: string;
  internalCode: string;
  barcode: string | null;
  brandName: string | null;
  isDda: boolean;
  patientDirections: string;
  priceCash: Prisma.Decimal;
  priceInsurance: Prisma.Decimal;
  categories: PosCategoryForDrug[];
  batches: PosBatchForDrug[];
};

export async function searchDrugsForPos(q: string) {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  const term = q.trim();
  if (term.length < 1) return [];
  const ddaSet = await getDdaCategorySetForOrg(session.user.organizationId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await prisma.drug.findMany({
    where: {
      organizationId: session.user.organizationId,
      status: "ACTIVE",
      // POS should only surface drugs that have sellable (non-expired) stock.
      batches: {
        some: {
          deletedAt: null,
          quantityOnHand: { gt: 0 },
          expiryDate: { gte: today },
        },
      },
      OR: [
        { genericName: { contains: term, mode: "insensitive" } },
        { internalCode: { contains: term, mode: "insensitive" } },
        { barcode: { contains: term, mode: "insensitive" } },
        { brandName: { contains: term, mode: "insensitive" } },
        {
          categories: {
            some: {
              category: {
                OR: [
                  { name: { contains: term, mode: "insensitive" } },
                  { slug: { contains: term, mode: "insensitive" } },
                ],
              },
            },
          },
        },
      ],
    },
    orderBy: { genericName: "asc" },
    include: {
      batches: {
        where: {
          deletedAt: null,
          quantityOnHand: { gt: 0 },
          expiryDate: { gte: today },
        },
        orderBy: { expiryDate: "asc" },
        select: { batchNumber: true, expiryDate: true, quantityOnHand: true },
      },
      categories: {
        include: { category: { select: { id: true, name: true, slug: true } } },
      },
    },
    // We'll sort by earliest expiry in app code, so we need a larger candidate set.
    take: 60,
  });

  // Put "almost expiring" first (FEFO visibility).
  rows.sort((a, b) => {
    const at = a.batches[0]?.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bt = b.batches[0]?.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return a.genericName.localeCompare(b.genericName);
  });

  const top = rows.slice(0, 20);
  return top.map((d) => ({
    id: d.id,
    genericName: d.genericName,
    internalCode: d.internalCode,
    barcode: d.barcode,
    brandName: d.brandName,
    isDda: drugIsDda(ddaSet, d.categories),
    patientDirections: d.patientDirections,
    priceCash: d.priceCash,
    priceInsurance: d.priceInsurance,
    categories: d.categories.map(({ category }) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    batches: d.batches.map((b) => ({
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate.toISOString(),
      quantityOnHand: b.quantityOnHand,
    })),
  })) satisfies DrugForPos[];
}

export async function listDrugs() {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  return prisma.drug.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { genericName: "asc" },
    include: {
      batches: {
        where: { deletedAt: null },
        select: { id: true, quantityOnHand: true, expiryDate: true },
      },
      categories: {
        include: { category: { select: { id: true, name: true, slug: true } } },
      },
    },
  });
}

export async function upsertDrug(
  input: unknown,
  id?: string,
) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  assertCanMutateInventory(session.user.role);
  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const data = drugFormSchema.parse(input);

  if (!id && !data.patientDirections.trim()) {
    throw new Error("Patient directions are required when adding a drug.");
  }

  const { categoryIds, ...rest } = data;

  if (categoryIds.length > 0) {
    const count = await prisma.drugCategory.count({
      where: { organizationId: orgId, id: { in: categoryIds } },
    });
    if (count !== categoryIds.length) {
      throw new Error("One or more categories are invalid.");
    }
  }

  const payload = {
    ...rest,
    priceCash: new Prisma.Decimal(data.priceCash),
    priceInsurance: new Prisma.Decimal(data.priceInsurance),
    buyingPrice:
      data.buyingPrice != null ? new Prisma.Decimal(data.buyingPrice) : null,
    costLast:
      data.costLast != null ? new Prisma.Decimal(data.costLast) : null,
  };

  if (id) {
    const existing = await prisma.drug.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new Error("Drug not found");
    const updated = await prisma.drug.update({
      where: { id },
      data: {
        ...payload,
        categories: {
          deleteMany: {},
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
      },
    });
    await writeAuditLog({
      organizationId: orgId,
      userId,
      action: "drug.update",
      entityType: "Drug",
      entityId: id,
    });
    revalidatePath("/inventory/drugs");
    return updated;
  }

  const created = await prisma.drug.create({
    data: {
      ...payload,
      organizationId: orgId,
      categories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
    },
  });
  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "drug.create",
    entityType: "Drug",
    entityId: created.id,
  });
  revalidatePath("/inventory/drugs");
  return created;
}
