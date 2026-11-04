"use server";

import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, SupplierBillStatus, SupplierPaymentMethod } from "@prisma/client";

function requireAdminOrg(session: Session | null) {
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return { orgId: session.user.organizationId, userId: session.user.id };
}

function dec(n: unknown) {
  if (n == null) return new Prisma.Decimal(0);
  if (n instanceof Prisma.Decimal) return n;
  return new Prisma.Decimal(String(n));
}

const createBillSchema = z.object({
  supplierId: z.string().cuid(),
  billNumber: z.string().max(128).optional().nullable(),
  title: z.string().max(256).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  billDate: z.string().datetime().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  subtotal: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0).optional().default(0),
});

export async function createSupplierBill(raw: unknown) {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);
  const input = createBillSchema.parse(raw);

  const subtotal = new Prisma.Decimal(String(input.subtotal));
  const taxAmount = new Prisma.Decimal(String(input.taxAmount ?? 0));
  const total = subtotal.add(taxAmount);

  const created = await prisma.supplierBill.create({
    data: {
      organizationId: orgId,
      supplierId: input.supplierId,
      billNumber: input.billNumber?.trim() || null,
      title: input.title?.trim() || null,
      notes: input.notes?.trim() || null,
      billDate: input.billDate ? new Date(input.billDate) : new Date(),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      subtotal,
      taxAmount,
      total,
      status: SupplierBillStatus.UNPAID,
    },
    select: { id: true },
  });

  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/suppliers/payables");
  return created;
}

export type SupplierBillRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  billNumber: string | null;
  billDate: string;
  dueAt: string | null;
  status: SupplierBillStatus;
  total: number;
  paid: number;
  balance: number;
  isOverdue: boolean;
};

export async function listSupplierBills(params?: {
  supplierId?: string;
  status?: SupplierBillStatus | "ALL";
  limit?: number;
}): Promise<SupplierBillRow[]> {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);

  const limit = Math.min(Math.max(params?.limit ?? 200, 1), 500);

  // Use SQL for efficient paid/balance computation.
  const supplierWhere = params?.supplierId ? Prisma.sql`AND b."supplierId" = ${params.supplierId}` : Prisma.sql``;
  const statusWhere =
    params?.status && params.status !== "ALL"
      ? Prisma.sql`AND b."status" = ${params.status}`
      : Prisma.sql``;

  const rows = await prisma.$queryRaw<
    {
      id: string;
      supplierId: string;
      supplierName: string;
      billNumber: string | null;
      billDate: Date;
      dueAt: Date | null;
      status: SupplierBillStatus;
      total: Prisma.Decimal;
      paid: Prisma.Decimal | null;
    }[]
  >(Prisma.sql`
    SELECT
      b."id" AS id,
      b."supplierId" AS "supplierId",
      s."name" AS "supplierName",
      b."billNumber" AS "billNumber",
      b."billDate" AS "billDate",
      b."dueAt" AS "dueAt",
      b."status" AS status,
      b."total" AS total,
      COALESCE(SUM(a."amount"), 0) AS paid
    FROM "SupplierBill" b
    JOIN "Supplier" s ON s."id" = b."supplierId"
    LEFT JOIN "SupplierPaymentAllocation" a ON a."supplierBillId" = b."id"
    WHERE b."organizationId" = ${orgId}
      ${supplierWhere}
      ${statusWhere}
    GROUP BY b."id", s."name"
    ORDER BY b."billDate" DESC, b."createdAt" DESC
    LIMIT ${limit}
  `);

  const now = new Date();
  return rows.map((r) => {
    const total = Number(r.total);
    const paid = Number(r.paid ?? 0);
    const balance = Math.max(0, total - paid);
    const isOverdue = Boolean(r.dueAt && balance > 0 && r.dueAt.getTime() < now.getTime());
    return {
      id: r.id,
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      billNumber: r.billNumber,
      billDate: r.billDate.toISOString(),
      dueAt: r.dueAt ? r.dueAt.toISOString() : null,
      status: r.status,
      total,
      paid,
      balance,
      isOverdue,
    };
  });
}

const payBillSchema = z.object({
  supplierBillId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  method: z.nativeEnum(SupplierPaymentMethod).optional().default("OTHER"),
  paidAt: z.string().datetime().optional().nullable(),
  reference: z.string().max(128).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function paySupplierBill(raw: unknown) {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);
  const input = payBillSchema.parse(raw);

  await prisma.$transaction(async (tx) => {
    const bill = await tx.supplierBill.findFirst({
      where: { id: input.supplierBillId, organizationId: orgId },
      select: { id: true, supplierId: true, total: true, status: true, voidedAt: true },
    });
    if (!bill) throw new Error("Bill not found.");
    if (bill.voidedAt) throw new Error("Bill is voided.");

    const paidAgg = await tx.supplierPaymentAllocation.aggregate({
      where: { supplierBillId: bill.id },
      _sum: { amount: true },
    });
    const alreadyPaid = dec(paidAgg._sum.amount);
    const total = dec(bill.total);
    const remaining = total.sub(alreadyPaid);
    if (remaining.lte(0)) throw new Error("This bill is already fully paid.");

    const amount = dec(input.amount);
    const applied = amount.gte(remaining) ? remaining : amount;

    const payment = await tx.supplierPayment.create({
      data: {
        organizationId: orgId,
        supplierId: bill.supplierId,
        method: input.method,
        amount: applied,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
        allocations: {
          create: {
            supplierBillId: bill.id,
            amount: applied,
          },
        },
      },
      select: { id: true },
    });

    const newPaid = alreadyPaid.add(applied);
    const newStatus =
      newPaid.gte(total)
        ? SupplierBillStatus.PAID
        : newPaid.gt(0)
          ? SupplierBillStatus.PARTIALLY_PAID
          : SupplierBillStatus.UNPAID;

    await tx.supplierBill.update({
      where: { id: bill.id },
      data: { status: newStatus },
    });

    return payment;
  });

  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/suppliers/payables");
}

