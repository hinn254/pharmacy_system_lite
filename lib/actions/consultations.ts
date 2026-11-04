"use server";

import type { AuthSession as Session } from "@/auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ConsultationCaseStatus,
  ConsultationPricingMode,
  PaymentMethod,
  PaymentStatus,
  EtimsComplianceStatus,
  Prisma,
} from "@prisma/client";
import { allocateFefo } from "@/lib/fefo";
import { createSaleFromConsultationSchema } from "@/lib/validations/consultation";
import { runPharmacyChat } from "@/lib/ai/chat";
import { queryConsultationCases } from "@/lib/consultation-case-queries";

function requireOrg(session: Session | null) {
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  return { orgId: session.user.organizationId, userId: session.user.id, role: session.user.role };
}

export async function listConsultationCases(params?: {
  status?: ConsultationCaseStatus;
  assignedDoctorOnly?: boolean;
}) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);

  return queryConsultationCases({
    organizationId: orgId,
    viewerUserId: userId,
    viewerRole: role,
    status: params?.status,
    assignedDoctorOnly: params?.assignedDoctorOnly,
  });
}

export async function getConsultationCaseById(caseId: string) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);

  const cs = await prisma.consultationCase.findFirst({
    where: { id: caseId, organizationId: orgId },
    include: {
      organization: { select: { name: true } },
      patient: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignedDoctor: { select: { id: true, name: true, email: true } },
      encounters: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { id: true, name: true, email: true } } },
      },
      medicationOrders: {
        orderBy: { createdAt: "desc" },
        include: {
          drug: {
            select: {
              id: true,
              genericName: true,
              brandName: true,
              internalCode: true,
              dosageForm: true,
              strengthValue: true,
              strengthUnit: true,
              patientDirections: true,
            },
          },
        },
      },
      checkout: true,
    },
  });
  if (!cs) return null;

  if (role === "DOCTOR" && cs.assignedDoctorId !== userId) {
    throw new Error("Unauthorized");
  }

  const inPharmacyDrugIds = Array.from(
    new Set(
      cs.medicationOrders
        .filter((o) => Boolean(o.drugId) && !o.fulfillOutside && o.quantity > 0)
        .map((o) => o.drugId as string),
    ),
  );

  const drugStockRows =
    inPharmacyDrugIds.length === 0
      ? []
      : await prisma.drugBatch.groupBy({
          by: ["drugId"],
          where: {
            organizationId: orgId,
            deletedAt: null,
            drugId: { in: inPharmacyDrugIds },
          },
          _sum: { quantityOnHand: true },
        });

  const drugStockOnHandByDrugId: Record<string, number> = {};
  for (const r of drugStockRows) {
    drugStockOnHandByDrugId[r.drugId] = r._sum.quantityOnHand ?? 0;
  }

  return { ...cs, drugStockOnHandByDrugId };
}

const createCaseSchema = z.object({
  patientId: z.string().min(1),
  assignedDoctorId: z.string().optional().nullable(),
});

export async function createConsultationCase(input: unknown) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);
  if (!(role === "ADMIN" || role === "PHARM_TECH")) throw new Error("Unauthorized");

  const data = createCaseSchema.parse(input);
  const created = await prisma.consultationCase.create({
    data: {
      organizationId: orgId,
      patientId: data.patientId,
      createdById: userId,
      assignedDoctorId: data.assignedDoctorId ?? null,
      status: data.assignedDoctorId ? "ASSIGNED" : "OPEN",
    },
    select: { id: true },
  });

  revalidatePath("/consultations");
  return created;
}

const assignDoctorSchema = z.object({
  caseId: z.string().min(1),
  doctorUserId: z.string().min(1),
});

export async function assignConsultationDoctor(input: unknown) {
  const session = await auth();
  const { orgId, role } = requireOrg(session);
  if (!(role === "ADMIN" || role === "PHARM_TECH")) throw new Error("Unauthorized");
  const data = assignDoctorSchema.parse(input);

  await prisma.consultationCase.update({
    where: { id: data.caseId, organizationId: orgId },
    data: {
      assignedDoctorId: data.doctorUserId,
      status: "ASSIGNED",
    },
  });

  revalidatePath("/consultations");
  revalidatePath(`/consultations/${data.caseId}`);
}

export async function listActiveDoctors() {
  const session = await auth();
  const { orgId, role } = requireOrg(session);
  if (!(role === "ADMIN" || role === "PHARM_TECH")) return [];

  const doctors = await prisma.doctorProfile.findMany({
    where: { organizationId: orgId, isActive: true, user: { deletedAt: null, bannedAt: null } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return doctors.map((d) => ({
    userId: d.userId,
    name: d.user.name ?? d.user.email,
    email: d.user.email,
  }));
}

const addEncounterSchema = z.object({
  caseId: z.string().min(1),
  temperatureC: z.coerce.number().optional().nullable(),
  weightKg: z.coerce.number().optional().nullable(),
  heightCm: z.coerce.number().optional().nullable(),
  bpSystolic: z.coerce.number().int().optional().nullable(),
  bpDiastolic: z.coerce.number().int().optional().nullable(),
  pulseBpm: z.coerce.number().int().optional().nullable(),
  spo2Percent: z.coerce.number().int().optional().nullable(),
  respRate: z.coerce.number().int().optional().nullable(),
  chiefComplaint: z.string().max(4000).optional().nullable(),
  assessment: z.string().max(12000).optional().nullable(),
  plan: z.string().max(12000).optional().nullable(),
  notes: z.string().max(12000).optional().nullable(),
}).superRefine((v, ctx) => {
  const hasNumber =
    v.temperatureC != null ||
    v.weightKg != null ||
    v.heightCm != null ||
    v.bpSystolic != null ||
    v.bpDiastolic != null ||
    v.pulseBpm != null ||
    v.spo2Percent != null ||
    v.respRate != null;
  const hasText =
    Boolean(v.chiefComplaint?.trim()) ||
    Boolean(v.assessment?.trim()) ||
    Boolean(v.plan?.trim()) ||
    Boolean(v.notes?.trim());
  if (!hasNumber && !hasText) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Encounter cannot be empty. Add vitals and/or clinical notes.",
      path: ["caseId"],
    });
  }
});

export async function addConsultationEncounter(input: unknown) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);
  if (role !== "DOCTOR") throw new Error("Unauthorized");
  const data = addEncounterSchema.parse(input);

  const cs = await prisma.consultationCase.findFirst({
    where: { id: data.caseId, organizationId: orgId },
    select: { id: true, assignedDoctorId: true },
  });
  if (!cs) throw new Error("Case not found");
  if (cs.assignedDoctorId !== userId) throw new Error("Unauthorized");

  const hasNumber =
    data.temperatureC != null ||
    data.weightKg != null ||
    data.heightCm != null ||
    data.bpSystolic != null ||
    data.bpDiastolic != null ||
    data.pulseBpm != null ||
    data.spo2Percent != null ||
    data.respRate != null;
  const hasText =
    Boolean(data.chiefComplaint?.trim()) ||
    Boolean(data.assessment?.trim()) ||
    Boolean(data.plan?.trim()) ||
    Boolean(data.notes?.trim());
  if (!hasNumber && !hasText) {
    throw new Error("Encounter cannot be empty.");
  }

  await prisma.consultationEncounter.create({
    data: {
      organizationId: orgId,
      caseId: data.caseId,
      createdById: userId,
      temperatureC: data.temperatureC == null ? null : data.temperatureC,
      weightKg: data.weightKg == null ? null : data.weightKg,
      heightCm: data.heightCm == null ? null : data.heightCm,
      bpSystolic: data.bpSystolic == null ? null : data.bpSystolic,
      bpDiastolic: data.bpDiastolic == null ? null : data.bpDiastolic,
      pulseBpm: data.pulseBpm == null ? null : data.pulseBpm,
      spo2Percent: data.spo2Percent == null ? null : data.spo2Percent,
      respRate: data.respRate == null ? null : data.respRate,
      chiefComplaint: data.chiefComplaint?.trim() || null,
      assessment: data.assessment?.trim() || null,
      plan: data.plan?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });

  await prisma.consultationCase.update({
    where: { id: data.caseId, organizationId: orgId },
    data: { status: "IN_CONSULT" },
  });

  revalidatePath(`/consultations/${data.caseId}`);
  revalidatePath("/doctor");
}

const upsertOrderSchema = z
  .object({
    caseId: z.string().min(1),
    drugId: z.string().optional().nullable(),
    externalDrugName: z.string().max(256).optional().nullable(),
    fulfillOutside: z.boolean().optional().default(false),
    quantity: z.coerce.number().int().positive(),
    instructions: z.string().max(2000).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    const hasDrug = Boolean(v.drugId?.trim());
    const hasExternal = Boolean(v.externalDrugName?.trim());
    if (!hasDrug && !hasExternal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a drug or enter an external medication name.",
        path: ["drugId"],
      });
    }
    if (hasDrug && hasExternal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Choose either an in-system drug or an external medication name (not both).",
        path: ["externalDrugName"],
      });
    }
  });

export async function addMedicationOrder(input: unknown) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);
  if (role !== "DOCTOR") throw new Error("Unauthorized");
  const data = upsertOrderSchema.parse(input);

  const cs = await prisma.consultationCase.findFirst({
    where: { id: data.caseId, organizationId: orgId },
    select: { assignedDoctorId: true },
  });
  if (!cs) throw new Error("Case not found");
  if (cs.assignedDoctorId !== userId) throw new Error("Unauthorized");

  const drugId = data.drugId?.trim() ? data.drugId.trim() : null;
  const externalDrugName = data.externalDrugName?.trim()
    ? data.externalDrugName.trim()
    : null;

  await prisma.consultationMedicationOrder.create({
    data: {
      organizationId: orgId,
      caseId: data.caseId,
      drugId,
      externalDrugName,
      fulfillOutside: Boolean(data.fulfillOutside),
      quantity: data.quantity,
      instructions: data.instructions?.trim() || null,
      status: "DRAFT",
    },
  });

  revalidatePath(`/consultations/${data.caseId}`);
}

const updateOrderSchema = z.object({
  orderId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  fulfillOutside: z.boolean().optional(),
  externalDrugName: z.string().max(256).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
});

export async function updateMedicationOrder(input: unknown) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);
  if (role !== "DOCTOR") throw new Error("Unauthorized");
  const data = updateOrderSchema.parse(input);

  const existing = await prisma.consultationMedicationOrder.findFirst({
    where: { id: data.orderId, organizationId: orgId },
    select: { id: true, caseId: true, case: { select: { assignedDoctorId: true } } },
  });
  if (!existing) throw new Error("Medication order not found");
  if (existing.case.assignedDoctorId !== userId) throw new Error("Unauthorized");

  const existingOrder = await prisma.consultationMedicationOrder.findFirst({
    where: { id: data.orderId, organizationId: orgId },
    select: { id: true, caseId: true, drugId: true },
  });
  if (!existingOrder) throw new Error("Medication order not found");

  await prisma.consultationMedicationOrder.update({
    where: { id: data.orderId },
    data: {
      quantity: data.quantity,
      instructions: data.instructions?.trim() || null,
      ...(typeof data.fulfillOutside === "boolean"
        ? { fulfillOutside: data.fulfillOutside }
        : {}),
      ...(existingOrder.drugId
        ? {}
        : {
            externalDrugName: data.externalDrugName?.trim()
              ? data.externalDrugName.trim()
              : null,
          }),
    },
  });

  revalidatePath(`/consultations/${existing.caseId}`);
}

const deleteOrderSchema = z.object({
  orderId: z.string().min(1),
});

export async function deleteMedicationOrder(input: unknown) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);
  if (role !== "DOCTOR") throw new Error("Unauthorized");
  const data = deleteOrderSchema.parse(input);

  const existing = await prisma.consultationMedicationOrder.findFirst({
    where: { id: data.orderId, organizationId: orgId },
    select: {
      id: true,
      caseId: true,
      status: true,
      case: { select: { assignedDoctorId: true } },
    },
  });
  if (!existing) throw new Error("Medication order not found");
  if (existing.case.assignedDoctorId !== userId) throw new Error("Unauthorized");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft medication orders can be removed.");
  }

  await prisma.consultationMedicationOrder.delete({
    where: { id: data.orderId },
  });

  revalidatePath(`/consultations/${existing.caseId}`);
}

export async function doctorMarkCaseReadyForCashier(caseId: string) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);
  if (role !== "DOCTOR") throw new Error("Unauthorized");

  const cs = await prisma.consultationCase.findFirst({
    where: { id: caseId, organizationId: orgId },
    select: { id: true, assignedDoctorId: true },
  });
  if (!cs) throw new Error("Case not found");
  if (cs.assignedDoctorId !== userId) throw new Error("Unauthorized");

  await prisma.consultationMedicationOrder.updateMany({
    where: {
      organizationId: orgId,
      caseId,
      status: { in: ["DRAFT", "SENT_TO_PHARMTECH"] },
    },
    data: { status: "SENT_TO_PHARMTECH" },
  });

  await prisma.consultationCase.update({
    where: { id: caseId, organizationId: orgId },
    data: { status: "READY_FOR_PHARMTECH" },
  });

  revalidatePath(`/consultations/${caseId}`);
  revalidatePath("/doctor");
}

export async function pharmTechSendCaseToCashier(caseId: string) {
  const session = await auth();
  const { orgId, role } = requireOrg(session);
  if (!(role === "PHARM_TECH" || role === "ADMIN")) throw new Error("Unauthorized");

  const cs = await prisma.consultationCase.findFirst({
    where: { id: caseId, organizationId: orgId },
    select: { id: true, status: true, checkout: { select: { cashierSaleId: true } } },
  });
  if (!cs) throw new Error("Case not found");
  if (cs.status !== "READY_FOR_PHARMTECH" && cs.status !== "IN_CONSULT" && cs.status !== "ASSIGNED") {
    throw new Error("Case not ready for pharm tech handoff.");
  }
  if (cs.checkout?.cashierSaleId) {
    throw new Error("This case has already been paid. You can only mark dispensed.");
  }

  await prisma.consultationMedicationOrder.updateMany({
    where: {
      organizationId: orgId,
      caseId,
      status: { in: ["DRAFT", "SENT_TO_PHARMTECH"] },
      fulfillOutside: false,
      quantity: { gt: 0 },
      drugId: { not: null },
    },
    data: { status: "SENT_TO_CASHIER" },
  });

  await prisma.consultationCase.update({
    where: { id: caseId, organizationId: orgId },
    data: { status: "READY_FOR_CASHIER" },
  });

  revalidatePath(`/consultations/${caseId}`);
  revalidatePath("/consultations");
}

export async function pharmTechMarkCaseDispensed(caseId: string) {
  const session = await auth();
  const { orgId, role } = requireOrg(session);
  if (!(role === "PHARM_TECH" || role === "ADMIN")) throw new Error("Unauthorized");

  const cs = await prisma.consultationCase.findFirst({
    where: { id: caseId, organizationId: orgId },
    select: { id: true, status: true, checkout: { select: { cashierSaleId: true } } },
  });
  if (!cs) throw new Error("Case not found");
  if (cs.status !== "READY_FOR_PHARMTECH") {
    throw new Error("Case is not ready for dispensing.");
  }
  if (!cs.checkout?.cashierSaleId) {
    throw new Error("This consultation has not been paid for yet.");
  }

  await prisma.consultationMedicationOrder.updateMany({
    where: { organizationId: orgId, caseId, status: { notIn: ["CANCELLED"] } },
    data: { status: "DISPENSED" },
  });

  await prisma.consultationCase.update({
    where: { id: caseId, organizationId: orgId },
    data: { status: "CLOSED" },
  });

  revalidatePath(`/consultations/${caseId}`);
  revalidatePath("/consultations");
}

export async function createSaleFromConsultation(raw: unknown) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);
  if (!(role === "CASHIER" || role === "ADMIN" || role === "PHARM_TECH")) {
    throw new Error("Unauthorized");
  }

  const parsed = createSaleFromConsultationSchema.parse(raw);

  for (const p of parsed.payments) {
    if (p.method === PaymentMethod.INSURANCE && !p.insuranceSchemeId?.trim()) {
      throw new Error("Select an insurance scheme for insurance payments.");
    }
  }

  const settings = await prisma.organizationSettings.findUnique({
    where: { orgId },
  });
  const applyTax = parsed.applyTax ?? true;
  const configuredTaxRatePercent = settings
    ? new Prisma.Decimal(settings.taxRatePercent)
    : new Prisma.Decimal(16);
  const configuredTaxRate = configuredTaxRatePercent.div(100);
  const taxRate = applyTax ? configuredTaxRate : new Prisma.Decimal(0);

  const sale = await prisma.$transaction(async (tx) => {
    const cs = await tx.consultationCase.findFirst({
      where: { id: parsed.caseId, organizationId: orgId },
      include: {
        patient: true,
        assignedDoctor: true,
        medicationOrders: {
          where: { status: { not: "CANCELLED" } },
          include: { drug: true },
        },
        checkout: true,
      },
    });
    if (!cs) throw new Error("Case not found");
    if (!cs.assignedDoctorId) throw new Error("Assign a doctor before checkout.");

    const doctorProfile = await tx.doctorProfile.findFirst({
      where: { organizationId: orgId, userId: cs.assignedDoctorId, isActive: true },
    });
    if (!doctorProfile) throw new Error("Doctor profile is missing or inactive.");

    const hasInsurancePayment = parsed.payments.some(
      (p) => p.method === PaymentMethod.INSURANCE,
    );
    const pricingMode: ConsultationPricingMode = hasInsurancePayment
      ? ConsultationPricingMode.INSURANCE
      : ConsultationPricingMode.CASH;
    const consultationFee = new Prisma.Decimal(
      pricingMode === "INSURANCE" ? doctorProfile.consultFeeInsurance : doctorProfile.consultFeeCash,
    );

    const ordersInPharmacy = cs.medicationOrders.filter(
      (o) =>
        o.status === "SENT_TO_CASHIER" &&
        o.quantity > 0 &&
        !o.fulfillOutside &&
        Boolean(o.drugId),
    );

    let medsSubtotal = new Prisma.Decimal(0);
    const linePayloads: {
      drugId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      useInsurance: boolean;
      directionsOverride: string | null;
      allocations: { batchId: string; quantity: number }[];
    }[] = [];

    const useInsurancePriceForMeds = pricingMode === "INSURANCE";

    for (const o of ordersInPharmacy) {
      const drugId = o.drugId;
      if (!drugId) {
        throw new Error("Invalid medication order: missing drugId for in-pharmacy fulfillment.");
      }

      const drug = o.drug;
      if (!drug || drug.organizationId !== orgId || drug.status !== "ACTIVE") {
        throw new Error(`Drug unavailable: ${drugId}`);
      }
      const unitPrice = useInsurancePriceForMeds ? drug.priceInsurance : drug.priceCash;
      const lineTotal = new Prisma.Decimal(unitPrice).mul(o.quantity);
      medsSubtotal = medsSubtotal.add(lineTotal);

      const allocations = await allocateFefo(tx, orgId, drugId, o.quantity);
      linePayloads.push({
        drugId,
        quantity: o.quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        lineTotal,
        useInsurance: useInsurancePriceForMeds,
        directionsOverride: o.instructions?.trim() ? o.instructions.trim() : null,
        allocations,
      });
    }

    const codesUnique = (parsed.discountCodes ?? [])
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
      .filter((c, i, arr) => arr.indexOf(c) === i);

    const now = new Date();
    const patientId = cs.patientId;

    if (codesUnique.length > 0 && linePayloads.length === 0) {
      throw new Error("Discount codes require at least one medicine line item.");
    }

    const priorCompletedSalesCount = await tx.sale.count({
      where: { organizationId: orgId, patientId, status: "COMPLETED" },
    });

    const discountRows = codesUnique.length
      ? await tx.discountCode.findMany({
          where: { organizationId: orgId, code: { in: codesUnique } },
          include: { drugs: true, patients: true },
        })
      : [];
    const byCode = new Map(discountRows.map((d) => [d.code, d]));

    const rejected: { code: string; reason: string }[] = [];

    function decMin(a: Prisma.Decimal, b: Prisma.Decimal) {
      return a.lte(b) ? a : b;
    }
    function decMax(a: Prisma.Decimal, b: Prisma.Decimal) {
      return a.gte(b) ? a : b;
    }

    const remaining = linePayloads.map((l) => new Prisma.Decimal(l.lineTotal));

    function eligibleLineIndexesFor(d: (typeof discountRows)[number]) {
      if (d.scopeType === "ALL_DRUGS") return remaining.map((_, i) => i);
      const set = new Set(d.drugs.map((x) => x.drugId));
      const ix: number[] = [];
      for (let i = 0; i < linePayloads.length; i++) {
        if (set.has(linePayloads[i]!.drugId)) ix.push(i);
      }
      return ix;
    }

    function sumRemaining(ix: number[]) {
      return ix.reduce((acc, i) => acc.add(remaining[i] ?? 0), new Prisma.Decimal(0));
    }

    function distributeDiscount(ix: number[], amount: Prisma.Decimal) {
      const eligibleSum = sumRemaining(ix);
      if (eligibleSum.lte(0)) return;
      let toApply = new Prisma.Decimal(amount);
      for (let k = 0; k < ix.length; k++) {
        const i = ix[k]!;
        const r = remaining[i]!;
        if (r.lte(0)) continue;
        const isLast = k === ix.length - 1;
        const share = isLast ? toApply : toApply.mul(r).div(eligibleSum);
        const applied = decMin(r, share);
        remaining[i] = r.sub(applied);
        toApply = toApply.sub(applied);
        if (toApply.lte(0)) break;
      }
    }

    const eligibleCodes = codesUnique
      .map((c) => ({ input: c, row: byCode.get(c) ?? null }))
      .filter((x) => {
        if (!x.row) {
          rejected.push({ code: x.input, reason: "Not found" });
          return false;
        }
        const d = x.row;
        if (!d.active) {
          rejected.push({ code: d.code, reason: "Inactive" });
          return false;
        }
        if (d.startsAt && now < d.startsAt) {
          rejected.push({ code: d.code, reason: "Not started yet" });
          return false;
        }
        if (d.endsAt && now > d.endsAt) {
          rejected.push({ code: d.code, reason: "Ended" });
          return false;
        }
        if (d.expiresAt && now > d.expiresAt) {
          rejected.push({ code: d.code, reason: "Expired" });
          return false;
        }
        if (d.patientSegment !== "ANY") {
          const isNew = priorCompletedSalesCount === 0;
          if (d.patientSegment === "NEW_PATIENT" && !isNew) {
            rejected.push({ code: d.code, reason: "New patients only" });
            return false;
          }
          if (d.patientSegment === "RETURNING_PATIENT" && isNew) {
            rejected.push({ code: d.code, reason: "Returning patients only" });
            return false;
          }
        }
        if (d.patients.length > 0) {
          if (!d.patients.some((p) => p.patientId === patientId)) {
            rejected.push({ code: d.code, reason: "Not eligible for this patient" });
            return false;
          }
        }
        return true;
      })
      .map((x) => x.row!);

    eligibleCodes.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      const at = a.valueType === "PERCENT" ? 0 : 1;
      const bt = b.valueType === "PERCENT" ? 0 : 1;
      if (at !== bt) return at - bt;
      return a.code.localeCompare(b.code);
    });

    if (rejected.length > 0) {
      const msg = rejected
        .slice(0, 3)
        .map((r) => `${r.code}: ${r.reason}`)
        .join(" · ");
      throw new Error(`Discount code rejected — ${msg}`);
    }

    let totalDiscount = new Prisma.Decimal(0);
    const appliedDiscounts: {
      discountCodeId: string;
      code: string;
      name: string;
      valueType: "PERCENT" | "FIXED";
      valuePercent: Prisma.Decimal | null;
      valueAmount: Prisma.Decimal | null;
      appliedAmount: Prisma.Decimal;
      sortOrder: number;
    }[] = [];

    for (let i = 0; i < eligibleCodes.length; i++) {
      const d = eligibleCodes[i]!;
      const ix = eligibleLineIndexesFor(d);
      const eligibleRemaining = sumRemaining(ix);
      if (eligibleRemaining.lte(0)) continue;

      let discount = new Prisma.Decimal(0);
      if (d.valueType === "PERCENT") {
        const pct = d.valuePercent ? new Prisma.Decimal(d.valuePercent).div(100) : new Prisma.Decimal(0);
        discount = eligibleRemaining.mul(pct);
      } else {
        const amt = d.valueAmount ? new Prisma.Decimal(d.valueAmount) : new Prisma.Decimal(0);
        discount = decMin(amt, eligibleRemaining);
      }

      if (discount.lte(0)) continue;
      distributeDiscount(ix, discount);
      totalDiscount = totalDiscount.add(discount);
      appliedDiscounts.push({
        discountCodeId: d.id,
        code: d.code,
        name: d.name,
        valueType: d.valueType,
        valuePercent: d.valuePercent ? new Prisma.Decimal(d.valuePercent) : null,
        valueAmount: d.valueAmount ? new Prisma.Decimal(d.valueAmount) : null,
        appliedAmount: discount,
        sortOrder: appliedDiscounts.length,
      });
    }

    const medsAfterDiscount = decMax(new Prisma.Decimal(0), medsSubtotal.sub(totalDiscount));
    const taxableAmount = medsAfterDiscount;
    const taxAmount = taxableAmount.mul(taxRate);

    const totalBeforeDiscount = medsSubtotal.add(consultationFee).add(medsSubtotal.mul(taxRate));
    const total = medsAfterDiscount.add(consultationFee).add(taxAmount);
    const subtotal = medsSubtotal.add(consultationFee);

    const paySum = parsed.payments.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(paySum - Number(total)) > 0.02) {
      throw new Error(
        `Payment total (${paySum.toFixed(2)}) must match sale total (${Number(total).toFixed(2)}).`,
      );
    }

    const lastSale = await tx.sale.findFirst({
      where: { organizationId: orgId },
      orderBy: { saleNumber: "desc" },
      select: { saleNumber: true },
    });
    const saleNumber = (lastSale?.saleNumber ?? 0) + 1;

    const created = await tx.sale.create({
      data: {
        organizationId: orgId,
        saleNumber,
        patientId,
        subtotal,
        discountAmount: totalDiscount,
        totalBeforeDiscount,
        taxableAmount,
        taxRateSnapshot: configuredTaxRatePercent,
        taxAmount,
        total,
        createdById: userId,
        etimsStatus: EtimsComplianceStatus.PENDING,
      },
    });

    const hasInPharmacyMeds = linePayloads.length > 0;

    if (linePayloads.length > 0) {
      // Keep existing POS behavior: create a prescription snapshot for client sales.
      const rxNumber = parsed.rxNumber?.trim()
        ? parsed.rxNumber.trim()
        : `RX-${saleNumber}`;
      const prescriberName = parsed.prescriberName?.trim()
        ? parsed.prescriberName.trim()
        : cs.assignedDoctor?.name?.trim() || "Prescription";
      await tx.prescription.create({
        data: {
          patientId,
          prescriberName,
          rxNumber,
          issuedAt: now,
          notes: `Created from consultation case ${cs.id}`,
          items: {
            create: linePayloads.map((lp) => ({
              drugId: lp.drugId,
              quantity: lp.quantity,
              instructions: lp.directionsOverride?.trim() || null,
            })),
          },
        },
      });
    }

    for (const ad of appliedDiscounts) {
      await tx.saleDiscount.create({
        data: {
          organizationId: orgId,
          saleId: created.id,
          discountCodeId: ad.discountCodeId,
          codeSnapshot: ad.code,
          nameSnapshot: ad.name,
          valueTypeSnapshot: ad.valueType,
          valuePercentSnapshot: ad.valuePercent,
          valueAmountSnapshot: ad.valueAmount,
          appliedAmount: ad.appliedAmount,
          sortOrder: ad.sortOrder,
        },
      });
    }

    for (const lp of linePayloads) {
      const sl = await tx.saleLine.create({
        data: {
          saleId: created.id,
          drugId: lp.drugId,
          quantity: lp.quantity,
          unitPrice: lp.unitPrice,
          lineTotal: lp.lineTotal,
          usedInsurancePrice: lp.useInsurance,
          directionsOverride: lp.directionsOverride,
        },
      });
      for (const alloc of lp.allocations) {
        await tx.saleLineBatch.create({
          data: {
            saleLineId: sl.id,
            batchId: alloc.batchId,
            quantity: alloc.quantity,
          },
        });
        await tx.drugBatch.update({
          where: { id: alloc.batchId },
          data: {
            quantityOnHand: { decrement: alloc.quantity },
          },
        });
        await tx.stockMovement.create({
          data: {
            organizationId: orgId,
            type: "SALE",
            drugId: lp.drugId,
            batchId: alloc.batchId,
            quantity: -alloc.quantity,
            saleId: created.id,
            createdById: userId,
          },
        });
      }
    }

    await tx.saleServiceLine.create({
      data: {
        saleId: created.id,
        description: `Consultation fee (${cs.assignedDoctor?.name ?? "Doctor"})`,
        quantity: 1,
        unitPrice: consultationFee,
        lineTotal: consultationFee,
        usedInsurancePrice: pricingMode === "INSURANCE",
      },
    });

    for (const p of parsed.payments) {
      const insuranceSchemeId: string | null = p.insuranceSchemeId?.trim() || null;
      if (insuranceSchemeId) {
        const scheme = await tx.insuranceScheme.findFirst({
          where: { id: insuranceSchemeId, organizationId: orgId },
        });
        if (!scheme) throw new Error("Invalid insurance scheme.");
      }

      const isInsurance = p.method === PaymentMethod.INSURANCE;
      await tx.payment.create({
        data: {
          saleId: created.id,
          method: p.method as PaymentMethod,
          amount: new Prisma.Decimal(p.amount),
          status: isInsurance ? PaymentStatus.PENDING : PaymentStatus.COMPLETED,
          mpesaPhoneNumber: p.mpesaPhone || null,
          mpesaManualType: p.mpesaManualType || null,
          mpesaManualRef: p.mpesaManualRef || null,
          mpesaBusinessNumber: p.mpesaBusinessNumber || null,
          insuranceMemberRef: p.insuranceMemberRef || null,
          insurancePolicyRef: p.insurancePolicyRef || null,
          insuranceSchemeId,
        },
      });
    }

    await tx.consultationCheckout.upsert({
      where: { caseId: cs.id },
      create: {
        organizationId: orgId,
        caseId: cs.id,
        buyInPharmacy: true,
        pricingMode,
        consultationFee,
        medsSubtotal,
        taxAmount,
        totalDue: total,
        cashierSaleId: created.id,
      },
      update: {
        pricingMode,
        consultationFee,
        medsSubtotal,
        taxAmount,
        totalDue: total,
        cashierSaleId: created.id,
      },
    });

    if (hasInPharmacyMeds) {
      // Payment complete; send back to pharm tech for dispensing.
      await tx.consultationCase.update({
        where: { id: cs.id, organizationId: orgId },
        data: { status: "READY_FOR_PHARMTECH" },
      });
      await tx.consultationMedicationOrder.updateMany({
        where: { organizationId: orgId, caseId: cs.id, status: { notIn: ["CANCELLED"] } },
        data: { status: "SENT_TO_PHARMTECH" },
      });
    } else {
      // Consultation-only payment; no dispensing needed.
      await tx.consultationCase.update({
        where: { id: cs.id, organizationId: orgId },
        data: { status: "CLOSED" },
      });
    }

    return created;
  });

  revalidatePath("/consultations");
  revalidatePath(`/consultations/${parsed.caseId}`);
  revalidatePath(`/pos/receipt/${sale.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/inventory/batches");
  revalidatePath("/clients");
  return sale;
}

export async function quoteConsultationCheckout(input: {
  caseId: string;
  paymentMethod: PaymentMethod;
  applyTax: boolean;
}) {
  const session = await auth();
  const { orgId, role } = requireOrg(session);
  if (!(role === "CASHIER" || role === "ADMIN" || role === "PHARM_TECH")) {
    throw new Error("Unauthorized");
  }

  const cs = await prisma.consultationCase.findFirst({
    where: { id: input.caseId, organizationId: orgId },
    include: {
      assignedDoctor: true,
      medicationOrders: { where: { status: { not: "CANCELLED" } }, include: { drug: true } },
    },
  });
  if (!cs) throw new Error("Case not found");
  if (!cs.assignedDoctorId) throw new Error("Assign a doctor before checkout.");

  const doctorProfile = await prisma.doctorProfile.findFirst({
    where: { organizationId: orgId, userId: cs.assignedDoctorId, isActive: true },
  });
  if (!doctorProfile) throw new Error("Doctor profile is missing or inactive.");

  const settings = await prisma.organizationSettings.findUnique({ where: { orgId } });
  const configuredTaxRatePercent = settings
    ? new Prisma.Decimal(settings.taxRatePercent)
    : new Prisma.Decimal(16);
  const configuredTaxRate = configuredTaxRatePercent.div(100);
  const taxRate = input.applyTax ? configuredTaxRate : new Prisma.Decimal(0);

  const pricingMode: ConsultationPricingMode =
    input.paymentMethod === PaymentMethod.INSURANCE
      ? ConsultationPricingMode.INSURANCE
      : ConsultationPricingMode.CASH;
  const consultationFee = new Prisma.Decimal(
    pricingMode === ConsultationPricingMode.INSURANCE
      ? doctorProfile.consultFeeInsurance
      : doctorProfile.consultFeeCash,
  );

  const ordersInPharmacy = cs.medicationOrders.filter(
    (o) =>
      o.status === "SENT_TO_CASHIER" &&
      o.quantity > 0 &&
      !o.fulfillOutside &&
      Boolean(o.drugId),
  );

  const meds: Array<{
    orderId: string;
    drugId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }> = [];

  let medsSubtotal = new Prisma.Decimal(0);
  for (const o of ordersInPharmacy) {
    const drug = o.drug;
    if (!drug || drug.organizationId !== orgId || drug.status !== "ACTIVE") continue;
    const unitPrice =
      pricingMode === ConsultationPricingMode.INSURANCE
        ? drug.priceInsurance
        : drug.priceCash;
    const lineTotal = new Prisma.Decimal(unitPrice).mul(o.quantity);
    medsSubtotal = medsSubtotal.add(lineTotal);
    meds.push({
      orderId: o.id,
      drugId: drug.id,
      name: drug.brandName ?? drug.genericName,
      quantity: o.quantity,
      unitPrice: Number(unitPrice),
      lineTotal: Number(lineTotal),
    });
  }

  // Note: discount codes handled in createSaleFromConsultation; quoting keeps it simple for now.
  const taxableAmount = medsSubtotal;
  const taxAmount = taxableAmount.mul(taxRate);
  const total = medsSubtotal.add(consultationFee).add(taxAmount);

  return {
    consultationFee: Number(consultationFee),
    medsSubtotal: Number(medsSubtotal),
    taxRatePercent: Number(configuredTaxRatePercent),
    taxAmount: Number(taxAmount),
    total: Number(total),
    medsCount: meds.length,
    meds,
  };
}

export async function analyzeConsultationOrders(caseId: string) {
  const session = await auth();
  const { orgId, userId, role } = requireOrg(session);
  if (role !== "DOCTOR") throw new Error("Unauthorized");

  const cs = await prisma.consultationCase.findFirst({
    where: { id: caseId, organizationId: orgId },
    include: {
      patient: true,
      encounters: { orderBy: { createdAt: "desc" }, take: 1 },
      medicationOrders: { where: { status: { not: "CANCELLED" } }, include: { drug: true } },
    },
  });
  if (!cs) throw new Error("Case not found");
  if (cs.assignedDoctorId !== userId) throw new Error("Unauthorized");

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  const organizationName = org?.name ?? "Pharmacy";

  const dob = cs.patient.dob ? new Date(cs.patient.dob) : null;
  const ageYears = dob
    ? Math.max(
        0,
        Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
      )
    : null;

  const latest = cs.encounters[0] ?? null;
  const vitals = latest
    ? {
        temperatureC: latest.temperatureC?.toString() ?? null,
        weightKg: latest.weightKg?.toString() ?? null,
        heightCm: latest.heightCm?.toString() ?? null,
        bpSystolic: latest.bpSystolic ?? null,
        bpDiastolic: latest.bpDiastolic ?? null,
        pulseBpm: latest.pulseBpm ?? null,
        spo2Percent: latest.spo2Percent ?? null,
        respRate: latest.respRate ?? null,
      }
    : null;

  const meds = cs.medicationOrders.map((o) => {
    const drug = o.drug;
    const name = drug?.genericName?.trim()
      ? drug.genericName
      : (o.externalDrugName?.trim() ? o.externalDrugName : "External medication");
    const strength = drug
      ? [drug.strengthValue, drug.strengthUnit].filter(Boolean).join(" ") || null
      : null;
    return {
      name,
      strength,
      route: drug?.routeOfAdmin ?? null,
      dosageForm: drug?.dosageForm ?? null,
      quantity: o.quantity,
      instructions: o.instructions ?? null,
      fulfillOutside: o.fulfillOutside,
    };
  });

  const userMessage = [
    "You are a clinical safety assistant. Provide ADVISORY warnings only; do not diagnose.",
    "Check for:",
    "- duplicate therapy",
    "- common contraindications or serious interactions",
    "- red flags given vitals/age",
    "- max dose reminders where appropriate (do not invent exact doses; speak generally unless confident).",
    "Return a short list of bullet warnings, each with a brief rationale.",
    "",
    "Patient:",
    `- age_years: ${ageYears ?? "unknown"}`,
    `- vitals: ${vitals ? JSON.stringify(vitals) : "unknown"}`,
    "",
    "Medication orders:",
    JSON.stringify(meds, null, 2),
  ].join("\n");

  const result = await runPharmacyChat({
    messages: [{ role: "user", content: userMessage }],
    pageContext: "consultation_safety",
    organizationId: orgId,
    organizationName,
    role,
  });

  return {
    message: result.assistantMessage,
    usage: result.usage,
    model: result.model,
  };
}

const pharmTechUpdateOrderSchema = z.object({
  orderId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  fulfillOutside: z.boolean().optional(),
  externalDrugName: z.string().max(256).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
});

export async function pharmTechUpdateMedicationOrder(input: unknown) {
  const session = await auth();
  const { orgId, role } = requireOrg(session);
  if (!(role === "PHARM_TECH" || role === "ADMIN")) throw new Error("Unauthorized");
  const data = pharmTechUpdateOrderSchema.parse(input);

  const existing = await prisma.consultationMedicationOrder.findFirst({
    where: { id: data.orderId, organizationId: orgId },
    select: {
      id: true,
      caseId: true,
      drugId: true,
      status: true,
      case: { select: { status: true, checkout: { select: { cashierSaleId: true } } } },
    },
  });
  if (!existing) throw new Error("Medication order not found");
  if (existing.case.checkout?.cashierSaleId) {
    throw new Error("Case already paid; medication list can’t be edited.");
  }
  if (existing.case.status !== "READY_FOR_PHARMTECH") {
    throw new Error("Medication list can only be edited when ready for pharmacy review.");
  }
  if (!(existing.status === "SENT_TO_PHARMTECH" || existing.status === "DRAFT")) {
    throw new Error("This medication order can’t be edited at its current stage.");
  }

  await prisma.consultationMedicationOrder.update({
    where: { id: data.orderId },
    data: {
      quantity: data.quantity,
      instructions: data.instructions?.trim() || null,
      ...(typeof data.fulfillOutside === "boolean" ? { fulfillOutside: data.fulfillOutside } : {}),
      ...(existing.drugId
        ? {}
        : {
            externalDrugName: data.externalDrugName?.trim() ? data.externalDrugName.trim() : null,
          }),
    },
  });

  revalidatePath(`/consultations/${existing.caseId}`);
}

