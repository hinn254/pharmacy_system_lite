import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConsultationCaseStatus, PosOrderStatus } from "@prisma/client";

export type NavBadgeCounts = Partial<
  Record<"/consultations" | "/pos/dispense" | "/doctor" | "/pos/cashier", number>
>;

/**
 * Sidebar pill counts: pending/active work per role, aligned with each page’s queue filters.
 */
export async function getNavBadgeCounts(): Promise<NavBadgeCounts> {
  const session = await auth();
  if (!session?.user?.organizationId) return {};
  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const role = session.user.role;
  const out: NavBadgeCounts = {};

  if (role === "CASHIER") {
    const [cashierPos, consultations] = await Promise.all([
      prisma.posOrder.count({
        where: {
          organizationId: orgId,
          status: {
            in: [PosOrderStatus.QUEUED, PosOrderStatus.IN_PROGRESS],
          },
        },
      }),
      prisma.consultationCase.count({
        where: {
          organizationId: orgId,
          status: ConsultationCaseStatus.READY_FOR_CASHIER,
        },
      }),
    ]);
    out["/pos/cashier"] = cashierPos;
    out["/consultations"] = consultations;
  }

  if (role === "ADMIN" || role === "PHARM_TECH") {
    const [dispensing, consultations] = await Promise.all([
      prisma.posOrder.count({
        where: {
          organizationId: orgId,
          status: PosOrderStatus.READY_TO_DISPENSE,
        },
      }),
      prisma.consultationCase.count({
        where: {
          organizationId: orgId,
          status: {
            notIn: [
              ConsultationCaseStatus.CLOSED,
              ConsultationCaseStatus.CANCELLED,
            ],
          },
        },
      }),
    ]);
    out["/pos/dispense"] = dispensing;
    out["/consultations"] = consultations;
  }

  if (role === "DOCTOR") {
    // Waiting to start consult — not yet IN_CONSULT / pharmacy / cashier.
    out["/doctor"] = await prisma.consultationCase.count({
      where: {
        organizationId: orgId,
        assignedDoctorId: userId,
        status: {
          in: [ConsultationCaseStatus.OPEN, ConsultationCaseStatus.ASSIGNED],
        },
      },
    });
  }

  return out;
}
