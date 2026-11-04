"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const listClaimsSchema = z.object({
  status: z.enum(["all", "pending", "paid"]).optional().default("all"),
  insuranceSchemeId: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export type InsuranceClaimRow = {
  paymentId: string;
  saleId: string;
  saleNumber: number;
  saleCreatedAt: string;
  patientName: string | null;
  amount: number;
  status: PaymentStatus;
  insuranceSchemeId: string;
  insuranceSchemeName: string;
  insuranceSchemeCode: string;
  memberRef: string | null;
  policyRef: string | null;
};

export async function listInsuranceClaims(raw?: unknown): Promise<InsuranceClaimRow[]> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") return [];
  const orgId = session.user.organizationId;

  const input = listClaimsSchema.parse(raw ?? {});
  const statusWhere: Pick<typeof prisma.payment, never> | object =
    input.status === "pending"
      ? { status: PaymentStatus.PENDING }
      : input.status === "paid"
        ? { status: PaymentStatus.COMPLETED }
        : {};

  const rows = await prisma.payment.findMany({
    where: {
      method: PaymentMethod.INSURANCE,
      insuranceSchemeId: input.insuranceSchemeId ? input.insuranceSchemeId : { not: null },
      sale: { organizationId: orgId, status: "COMPLETED" },
      ...statusWhere,
    },
    orderBy: [{ sale: { createdAt: "desc" } }, { createdAt: "desc" }],
    take: input.limit,
    include: {
      insuranceScheme: { select: { id: true, name: true, code: true } },
      sale: {
        select: {
          id: true,
          saleNumber: true,
          createdAt: true,
          patient: { select: { fullName: true } },
        },
      },
    },
  });

  return rows
    .filter((p) => p.insuranceScheme)
    .map((p) => ({
      paymentId: p.id,
      saleId: p.saleId,
      saleNumber: p.sale.saleNumber,
      saleCreatedAt: p.sale.createdAt.toISOString(),
      patientName: p.sale.patient?.fullName ?? null,
      amount: Number(p.amount),
      status: p.status,
      insuranceSchemeId: p.insuranceScheme!.id,
      insuranceSchemeName: p.insuranceScheme!.name,
      insuranceSchemeCode: p.insuranceScheme!.code,
      memberRef: p.insuranceMemberRef,
      policyRef: p.insurancePolicyRef,
    }));
}

