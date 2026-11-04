"use server";

import type { AuthSession as Session } from "@/auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ExpenseCategory, Prisma } from "@prisma/client";

function requireAdminOrg(session: Session | null) {
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return { orgId: session.user.organizationId };
}

const createExpenseSchema = z.object({
  category: z.nativeEnum(ExpenseCategory).optional().default("OTHER"),
  description: z.string().min(1).max(256),
  amount: z.coerce.number().positive(),
  spentAt: z.string().datetime().optional().nullable(),
  reference: z.string().max(128).optional().nullable(),
});

export async function createExpense(raw: unknown) {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);
  const input = createExpenseSchema.parse(raw);

  const created = await prisma.expense.create({
    data: {
      organizationId: orgId,
      category: input.category,
      description: input.description.trim(),
      amount: new Prisma.Decimal(String(input.amount)),
      spentAt: input.spentAt ? new Date(input.spentAt) : new Date(),
      reference: input.reference?.trim() || null,
    },
    select: { id: true },
  });

  revalidatePath("/admin/finance");
  return created;
}

export type ExpenseRow = {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  spentAt: string;
  reference: string | null;
};

export async function listExpenses(params?: {
  from?: string;
  to?: string;
  limit?: number;
  search?: string;
}): Promise<ExpenseRow[]> {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);

  const limit = Math.min(Math.max(params?.limit ?? 200, 1), 500);
  const from = params?.from ? new Date(params.from) : null;
  const to = params?.to ? new Date(params.to) : null;
  const term = params?.search?.trim();

  const rows = await prisma.expense.findMany({
    where: {
      organizationId: orgId,
      ...(from || to
        ? {
            spentAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(term
        ? {
            OR: [
              { description: { contains: term, mode: "insensitive" } },
              { reference: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return rows.map((e) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    spentAt: e.spentAt.toISOString(),
    reference: e.reference,
  }));
}

export async function sumExpenses(params: { from: string; to: string }) {
  const session = await auth();
  const { orgId } = requireAdminOrg(session);
  const from = new Date(params.from);
  const to = new Date(params.to);

  const agg = await prisma.expense.aggregate({
    where: { organizationId: orgId, spentAt: { gte: from, lte: to } },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

