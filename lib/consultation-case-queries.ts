import { prisma } from "@/lib/prisma";
import type { ConsultationCaseStatus, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * Shared Prisma query for consultation boards (RSC pages and server actions).
 * Mirrors the filters previously in `listConsultationCases`.
 */
export async function queryConsultationCases(input: {
  organizationId: string;
  viewerUserId: string;
  viewerRole: UserRole;
  status?: ConsultationCaseStatus;
  assignedDoctorOnly?: boolean;
}) {
  const where: Prisma.ConsultationCaseWhereInput = {
    organizationId: input.organizationId,
  };
  if (input.status) where.status = input.status;
  if (input.viewerRole === "DOCTOR" || input.assignedDoctorOnly) {
    where.assignedDoctorId = input.viewerUserId;
  }

  return prisma.consultationCase.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      patient: true,
      assignedDoctor: { select: { id: true, name: true, email: true } },
      checkout: { select: { cashierSaleId: true } },
    },
    take: 200,
  });
}
