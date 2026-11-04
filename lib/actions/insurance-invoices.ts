"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { InsuranceInvoiceStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import type { AuthSession as Session } from "@/auth";

function requireAdminOrg(session: Session | null) {
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return { orgId: session.user.organizationId, userId: session.user.id };
}

function money(n: unknown): Prisma.Decimal {
  if (n == null) return new Prisma.Decimal(0);
  if (n instanceof Prisma.Decimal) return n;
  return new Prisma.Decimal(String(n));
}

const createInsuranceInvoiceSchema = z.object({
  insuranceSchemeId: z.string().cuid(),
  periodFrom: z.string().datetime().optional().nullable(),
  periodTo: z.string().datetime().optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function createInsuranceInvoice(raw: unknown) {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);
  const input = createInsuranceInvoiceSchema.parse(raw);

  const periodFrom = input.periodFrom ? new Date(input.periodFrom) : null;
  const periodTo = input.periodTo ? new Date(input.periodTo) : null;
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;

  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.insuranceInvoice.findFirst({
      where: { organizationId: orgId },
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });
    const invoiceNumber = (last?.invoiceNumber ?? 0) + 1;

    const paymentWhere: Prisma.PaymentWhereInput = {
      method: PaymentMethod.INSURANCE,
      status: PaymentStatus.PENDING,
      insuranceSchemeId: input.insuranceSchemeId,
      sale: {
        organizationId: orgId,
        status: "COMPLETED",
        ...(periodFrom || periodTo
          ? {
              createdAt: {
                ...(periodFrom ? { gte: periodFrom } : {}),
                ...(periodTo ? { lte: periodTo } : {}),
              },
            }
          : {}),
      },
      insuranceInvoiceLine: null,
    };

    // Find eligible claim payments that are not yet invoiced.
    const payments = await tx.payment.findMany({
      where: paymentWhere,
      orderBy: [{ sale: { createdAt: "asc" } }, { createdAt: "asc" }],
      include: {
        sale: {
          select: {
            id: true,
            saleNumber: true,
            createdAt: true,
            patient: { select: { fullName: true } },
          },
        },
      },
      take: 1000,
    });

    if (payments.length === 0) {
      throw new Error("No pending insurance claims found for this scheme (or all are already invoiced).");
    }

    const subtotal = payments.reduce(
      (acc, p) => acc.add(money(p.amount)),
      new Prisma.Decimal(0),
    );
    const taxAmount = new Prisma.Decimal(0);
    const total = subtotal.add(taxAmount);

    const invoice = await tx.insuranceInvoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber,
        insuranceSchemeId: input.insuranceSchemeId,
        status: InsuranceInvoiceStatus.DRAFT,
        periodFrom,
        periodTo,
        dueAt,
        notes: input.notes?.trim() || null,
        subtotal,
        taxAmount,
        total,
        lines: {
          create: payments.map((p) => ({
            paymentId: p.id,
            saleId: p.saleId,
            saleNumber: p.sale.saleNumber,
            saleCreatedAt: p.sale.createdAt,
            patientNameSnapshot: p.sale.patient?.fullName ?? null,
            memberRefSnapshot: p.insuranceMemberRef ?? null,
            policyRefSnapshot: p.insurancePolicyRef ?? null,
            amount: money(p.amount),
          })),
        },
      },
      select: { id: true },
    });

    return invoice;
  });

  revalidatePath("/admin/insurers");
  revalidatePath("/admin/insurers/invoices");
  return created;
}

const listInvoicesSchema = z.object({
  insuranceSchemeId: z.string().cuid().optional(),
  status: z.nativeEnum(InsuranceInvoiceStatus).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export type InsuranceInvoiceListRow = {
  id: string;
  invoiceNumber: number;
  status: InsuranceInvoiceStatus;
  schemeId: string;
  schemeName: string;
  schemeCode: string;
  total: number;
  lineCount: number;
  createdAt: string;
  periodFrom: string | null;
  periodTo: string | null;
  dueAt: string | null;
};

export async function listInsuranceInvoices(raw?: unknown): Promise<InsuranceInvoiceListRow[]> {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);
  const input = listInvoicesSchema.parse(raw ?? {});

  const rows = await prisma.insuranceInvoice.findMany({
    where: {
      organizationId: orgId,
      ...(input.insuranceSchemeId ? { insuranceSchemeId: input.insuranceSchemeId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: input.limit,
    include: {
      insuranceScheme: { select: { id: true, name: true, code: true } },
      _count: { select: { lines: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    status: r.status,
    schemeId: r.insuranceScheme.id,
    schemeName: r.insuranceScheme.name,
    schemeCode: r.insuranceScheme.code,
    total: Number(r.total),
    lineCount: r._count.lines,
    createdAt: r.createdAt.toISOString(),
    periodFrom: r.periodFrom ? r.periodFrom.toISOString() : null,
    periodTo: r.periodTo ? r.periodTo.toISOString() : null,
    dueAt: r.dueAt ? r.dueAt.toISOString() : null,
  }));
}

export async function getInsuranceInvoiceById(id: string) {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);

  return prisma.insuranceInvoice.findFirst({
    where: { id, organizationId: orgId },
    include: {
      insuranceScheme: true,
      lines: {
        orderBy: [{ saleCreatedAt: "asc" }],
        include: {
          sale: {
            select: {
              id: true,
              saleNumber: true,
              createdAt: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              amount: true,
            },
          },
        },
      },
      payments: { orderBy: [{ receivedAt: "desc" }] },
      organization: { include: { settings: true } },
    },
  });
}

const setStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(InsuranceInvoiceStatus),
});

export async function setInsuranceInvoiceStatus(raw: unknown) {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);
  const input = setStatusSchema.parse(raw);

  const existing = await prisma.insuranceInvoice.findFirst({
    where: { id: input.id, organizationId: orgId },
    select: { id: true, status: true },
  });
  if (!existing) throw new Error("Invoice not found.");

  const now = new Date();
  await prisma.insuranceInvoice.update({
    where: { id: input.id },
    data: {
      status: input.status,
      submittedAt: input.status === "SUBMITTED" ? now : undefined,
      voidedAt: input.status === "VOIDED" ? now : undefined,
      paidAt: input.status === "PAID" ? now : undefined,
    },
  });

  revalidatePath("/admin/insurers/invoices");
  revalidatePath(`/admin/insurers/invoices/${input.id}`);
}

const addPaymentSchema = z.object({
  insuranceInvoiceId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  receivedAt: z.string().datetime().optional().nullable(),
  reference: z.string().max(128).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function addInsuranceInvoicePayment(raw: unknown) {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);
  const input = addPaymentSchema.parse(raw);

  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();

  await prisma.$transaction(async (tx) => {
    const inv = await tx.insuranceInvoice.findFirst({
      where: { id: input.insuranceInvoiceId, organizationId: orgId },
      select: { id: true, total: true },
    });
    if (!inv) throw new Error("Invoice not found.");

    await tx.insuranceInvoicePayment.create({
      data: {
        insuranceInvoiceId: inv.id,
        amount: new Prisma.Decimal(String(input.amount)),
        receivedAt,
        reference: input.reference?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });

    const paidAgg = await tx.insuranceInvoicePayment.aggregate({
      where: { insuranceInvoiceId: inv.id },
      _sum: { amount: true },
    });
    const paid = money(paidAgg._sum.amount);
    const total = money(inv.total);

    const status =
      paid.gte(total)
        ? InsuranceInvoiceStatus.PAID
        : paid.gt(0)
          ? InsuranceInvoiceStatus.PARTIALLY_PAID
          : InsuranceInvoiceStatus.SUBMITTED;

    await tx.insuranceInvoice.update({
      where: { id: inv.id },
      data: {
        status,
        paidAt: paid.gte(total) ? new Date() : null,
      },
    });
  });

  revalidatePath("/admin/insurers/invoices");
  revalidatePath(`/admin/insurers/invoices/${input.insuranceInvoiceId}`);
}

