"use server";

import { revalidatePath } from "next/cache";
import {
  MpesaManualType,
  Prisma,
  PaymentMethod,
  PosOrderStatus,
} from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import { normalizeKenyaMsisdn } from "@/lib/phone";
import {
  createPosOrderSchema,
  finalizePosOrderSchema,
  type CreatePosOrderInput,
} from "@/lib/validations/pos-order";
import { createSaleFromParsed } from "@/lib/actions/sales";
import { createSaleSchema } from "@/lib/validations/sale";
import { drugIsDda } from "@/lib/controlled-drug-categories";
import { getDdaCategorySetForOrg } from "@/lib/org-controlled-drug-categories";

function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}

function decToString(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "object" && v && "toString" in v) return String(v);
  return String(v);
}

export async function createPosOrderFromCart(raw: unknown) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  if (!(session.user.role === "ADMIN" || session.user.role === "PHARM_TECH")) {
    throw new Error("Unauthorized");
  }

  const orgId = session.user.organizationId;
  const userId = session.user.id;
  const parsed = createPosOrderSchema.parse(raw);

  function paymentQueueSnapshotForDb(
    input: CreatePosOrderInput,
  ): Prisma.InputJsonValue | undefined {
    const m = input.selectedPaymentMethod;
    const snap = input.paymentQueueSnapshot;
    if (m === PaymentMethod.CASH) return undefined;
    if (m === PaymentMethod.INSURANCE) {
      return {
        insuranceMemberRef: snap!.insuranceMemberRef!.trim(),
        insurancePolicyRef: snap?.insurancePolicyRef?.trim() || null,
      };
    }
    if (m === PaymentMethod.MPESA_STK) {
      const norm = normalizeKenyaMsisdn(snap!.mpesaPhone ?? "");
      return { mpesaPhone: norm! };
    }
    if (m === PaymentMethod.MPESA_MANUAL) {
      return {
        mpesaManualType: snap?.mpesaManualType ?? MpesaManualType.PAYBILL,
        mpesaManualRef: snap!.mpesaManualRef!.trim(),
        mpesaBusinessNumber: snap!.mpesaBusinessNumber!.trim(),
      };
    }
    return undefined;
  }

  const [settings, ddaSet] = await Promise.all([
    prisma.organizationSettings.findUnique({
      where: { orgId },
      select: { taxRatePercent: true },
    }),
    getDdaCategorySetForOrg(orgId),
  ]);
  const applyTax = parsed.applyTax ?? true;
  const configuredTaxRatePercent = settings
    ? new Prisma.Decimal(settings.taxRatePercent)
    : new Prisma.Decimal(16);
  const configuredTaxRate = configuredTaxRatePercent.div(100);
  const taxRate = applyTax ? configuredTaxRate : new Prisma.Decimal(0);

  const discountCodesUnique = (parsed.discountCodes ?? [])
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
    .filter((c, i, arr) => arr.indexOf(c) === i);

  const order = await prisma.$transaction(async (tx) => {
    // Resolve lines, compute subtotal from current drug prices
    const resolvedLines: {
      drugId: string;
      quantity: number;
      useInsurance: boolean;
      directionsOverride: string | null;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      isDda: boolean;
    }[] = [];

    let subtotal = new Prisma.Decimal(0);
    let hasDda = false;

    for (const line of parsed.lines) {
      const drug = await tx.drug.findFirst({
        where: { id: line.drugId, organizationId: orgId },
        select: {
          id: true,
          status: true,
          priceCash: true,
          priceInsurance: true,
          categories: ddaSet ? { select: { categoryId: true } } : false,
        },
      });
      if (!drug || drug.status !== "ACTIVE") {
        throw new Error(`Drug unavailable: ${line.drugId}`);
      }
      const isDda = drugIsDda(ddaSet, drug.categories);
      if (isDda) hasDda = true;

      const useInsurance = line.useInsurancePrice ?? false;
      const unitPrice = useInsurance ? drug.priceInsurance : drug.priceCash;
      const qty = line.quantity;
      const lineTotal = new Prisma.Decimal(unitPrice).mul(qty);
      subtotal = subtotal.add(lineTotal);

      resolvedLines.push({
        drugId: line.drugId,
        quantity: qty,
        useInsurance,
        directionsOverride: line.instructions?.trim() ? line.instructions.trim() : null,
        unitPrice: new Prisma.Decimal(unitPrice),
        lineTotal,
        isDda,
      });
    }

    if (hasDda) {
      if (!parsed.patientId?.trim()) {
        throw new Error("Controlled (DDA) medicines require selecting a patient.");
      }
      if (!parsed.prescriptionPhotoUrl?.trim()) {
        throw new Error("Controlled (DDA) medicines require uploading a prescription document.");
      }
    }

    // Reuse discount logic by “dry-running” createSale discount calculation.
    // We do this by letting createSaleSchema validate but NOT creating a sale; instead we mirror the discount logic here.
    // For now, we apply discount as 0 at order stage if any codes were provided but are invalid; cashier will see the error on finalize.
    // (We still snapshot the codes for finalize.)
    const subtotalAfterDiscount = subtotal;
    const taxAmount = subtotalAfterDiscount.mul(taxRate);
    const total = subtotalAfterDiscount.add(taxAmount);

    const created = await tx.posOrder.create({
      data: {
        organizationId: orgId,
        status: PosOrderStatus.QUEUED,
        patientId: parsed.patientId || null,
        prescriptionPhotoUrl: parsed.prescriptionPhotoUrl || null,
        selectedPaymentMethod: parsed.selectedPaymentMethod,
        discountCodesSnapshot: discountCodesUnique,
        paymentQueueSnapshot: paymentQueueSnapshotForDb(parsed),
        selectedInsuranceSchemeId: parsed.selectedInsuranceSchemeId?.trim() || null,
        subtotalSnapshot: subtotal,
        discountAmountSnapshot: new Prisma.Decimal(0),
        taxAmountSnapshot: taxAmount,
        totalSnapshot: total,
        taxableAmountSnapshot: subtotalAfterDiscount,
        taxRateSnapshot: configuredTaxRatePercent,
        vatEnabledSnapshot: applyTax,
        createdById: userId,
        lines: {
          create: resolvedLines.map((l) => ({
            drugId: l.drugId,
            quantity: l.quantity,
            useInsurancePrice: l.useInsurance,
            directionsOverride: l.directionsOverride,
            unitPriceSnapshot: l.unitPrice,
            lineTotalSnapshot: l.lineTotal,
          })),
        },
      },
      include: {
        patient: { select: { fullName: true, phone: true } },
        lines: { include: { drug: { select: { genericName: true } } } },
      },
    });

    return created;
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "pos_order.create",
    entityType: "PosOrder",
    entityId: order.id,
    metadata: { status: order.status },
  });

  revalidatePath("/pos");
  revalidatePath("/pos/cashier");
  revalidatePath("/dashboard");
  return { id: order.id };
}

export async function listQueuedPosOrders() {
  const session = await requireRoles("CASHIER", "ADMIN");
  const orgId = session.user.organizationId;

  const ddaSet = await getDdaCategorySetForOrg(orgId);

  const orders = await prisma.posOrder.findMany({
    where: {
      organizationId: orgId,
      status: {
        in: [PosOrderStatus.QUEUED, PosOrderStatus.IN_PROGRESS],
      },
    },
    orderBy: [{ createdAt: "asc" }],
    include: {
      patient: { select: { fullName: true, phone: true } },
      createdBy: { select: { name: true, email: true } },
      pickedBy: { select: { name: true, email: true } },
      selectedInsuranceScheme: true,
      lines: {
        include: {
          drug: {
            select: {
              genericName: true,
              priceCash: true,
              priceInsurance: true,
              categories: ddaSet ? { select: { categoryId: true } } : false,
            },
          },
        },
      },
    },
  });

  const now = Date.now();
  return orders.map((o) => ({
    id: o.id,
    organizationId: o.organizationId,
    orderNumber: o.orderNumber,
    status: o.status,
    patientId: o.patientId,
    prescriptionPhotoUrl: o.prescriptionPhotoUrl,
    hasDda: o.lines.some((l) => drugIsDda(ddaSet, l.drug.categories)),
    selectedPaymentMethod: o.selectedPaymentMethod,
    discountCodesSnapshot: o.discountCodesSnapshot,
    paymentQueueSnapshot: o.paymentQueueSnapshot,
    selectedInsuranceSchemeId: o.selectedInsuranceSchemeId,
    subtotalSnapshot: decToString(o.subtotalSnapshot),
    discountAmountSnapshot: decToString(o.discountAmountSnapshot),
    taxAmountSnapshot: decToString(o.taxAmountSnapshot),
    totalSnapshot: decToString(o.totalSnapshot),
    taxableAmountSnapshot: decToString(o.taxableAmountSnapshot),
    taxRateSnapshot: decToString(o.taxRateSnapshot),
    vatEnabledSnapshot: o.vatEnabledSnapshot,
    createdById: o.createdById,
    pickedById: o.pickedById,
    pickedUpAt: o.pickedUpAt?.toISOString() ?? null,
    finalizedAt: o.finalizedAt?.toISOString() ?? null,
    sentToDispenseAt: o.sentToDispenseAt?.toISOString() ?? null,
    dispensedAt: o.dispensedAt?.toISOString() ?? null,
    saleId: o.saleId,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    patient: o.patient,
    createdBy: o.createdBy,
    pickedBy: o.pickedBy,
    selectedInsuranceScheme: o.selectedInsuranceScheme,
    lines: o.lines.map((l) => ({
      id: l.id,
      posOrderId: l.posOrderId,
      drugId: l.drugId,
      quantity: l.quantity,
      useInsurancePrice: l.useInsurancePrice,
      directionsOverride: l.directionsOverride,
      unitPriceSnapshot: decToString(l.unitPriceSnapshot),
      lineTotalSnapshot: decToString(l.lineTotalSnapshot),
      drug: {
        genericName: l.drug.genericName,
        priceCash: decToString(l.drug.priceCash),
        priceInsurance: decToString(l.drug.priceInsurance),
      },
    })),
    waitingSeconds: Math.max(0, Math.floor((now - o.createdAt.getTime()) / 1000)),
  }));
}

export async function pickUpPosOrder(posOrderId: string) {
  const session = await requireRoles("CASHIER", "ADMIN");
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const updated = await prisma.posOrder.updateMany({
    where: {
      id: posOrderId,
      organizationId: orgId,
      status: PosOrderStatus.QUEUED,
    },
    data: {
      status: PosOrderStatus.IN_PROGRESS,
      pickedById: userId,
      pickedUpAt: new Date(),
    },
  });

  if (updated.count === 0) {
    throw new Error("Order is not available to pick.");
  }

  revalidatePath("/pos/cashier");
  revalidatePath("/dashboard");
  return true;
}

export async function finalizePosOrderToSale(raw: unknown) {
  const session = await requireRoles("CASHIER", "ADMIN");
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const parsed = finalizePosOrderSchema.parse(raw);

  const order = await prisma.posOrder.findFirst({
    where: { id: parsed.posOrderId, organizationId: orgId },
    include: {
      lines: {
        include: {
          drug: {
            select: {
              categories: { select: { categoryId: true } },
            },
          },
        },
      },
    },
  });

  if (!order) throw new Error("Order not found.");
  if (
    order.status !== PosOrderStatus.QUEUED &&
    order.status !== PosOrderStatus.IN_PROGRESS
  ) {
    throw new Error("Order is not in a payable state.");
  }

  // If not yet picked, auto-pick for this cashier.
  if (order.status === PosOrderStatus.QUEUED) {
    await prisma.posOrder.updateMany({
      where: { id: order.id, organizationId: orgId, status: PosOrderStatus.QUEUED },
      data: { status: PosOrderStatus.IN_PROGRESS, pickedById: userId, pickedUpAt: new Date() },
    });
  }

  const ddaSet = await getDdaCategorySetForOrg(orgId);
  const hasDda = order.lines.some((l) => drugIsDda(ddaSet, l.drug.categories));
  if (hasDda) {
    if (!order.patientId?.trim()) {
      throw new Error("Controlled (DDA) medicines require selecting a patient.");
    }
    if (!order.prescriptionPhotoUrl?.trim()) {
      throw new Error("Controlled (DDA) medicines require uploading a prescription document.");
    }
  }

  const discountCodes = isStringArray(order.discountCodesSnapshot)
    ? order.discountCodesSnapshot
    : [];

  const useInsuranceLinePricing = parsed.payments.some(
    (p) => p.method === PaymentMethod.INSURANCE,
  );

  const salePayload = {
    patientId: order.patientId,
    prescriberName: null,
    rxNumber: null,
    applyTax: order.vatEnabledSnapshot,
    discountCodes,
    lines: order.lines.map((l) => ({
      drugId: l.drugId,
      quantity: l.quantity,
      useInsurancePrice: useInsuranceLinePricing,
      instructions: l.directionsOverride,
    })),
    payments: parsed.payments,
  };

  const saleParsed = createSaleSchema.parse(salePayload);
  const sale = await createSaleFromParsed({
    parsed: saleParsed,
    orgId,
    userId,
    syncPaymentAmountsToComputedTotal: true,
  });

  const now = new Date();
  await prisma.posOrder.update({
    where: { id: order.id },
    data: {
      status: PosOrderStatus.READY_TO_DISPENSE,
      saleId: sale.id,
      finalizedAt: now,
      sentToDispenseAt: now,
      pickedById: order.pickedById ?? userId,
      pickedUpAt: order.pickedUpAt ?? now,
    },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "pos_order.finalize_to_sale",
    entityType: "PosOrder",
    entityId: order.id,
    metadata: { saleId: sale.id, sentToDispense: true },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "pos_order.send_to_dispense",
    entityType: "PosOrder",
    entityId: order.id,
    metadata: { saleId: sale.id, auto: true },
  });

  revalidatePath("/pos/cashier");
  revalidatePath("/pos/dispense");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  return { id: sale.id };
}

export async function sendPosOrderToDispense(posOrderId: string) {
  const session = await requireRoles("CASHIER", "ADMIN");
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const updated = await prisma.posOrder.updateMany({
    where: {
      id: posOrderId,
      organizationId: orgId,
      status: PosOrderStatus.FINALIZED,
    },
    data: {
      status: PosOrderStatus.READY_TO_DISPENSE,
      sentToDispenseAt: new Date(),
    },
  });

  if (updated.count === 0) throw new Error("Order is not ready to send.");

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "pos_order.send_to_dispense",
    entityType: "PosOrder",
    entityId: posOrderId,
  });

  revalidatePath("/pos/dispense");
  revalidatePath("/pos/cashier");
  revalidatePath("/dashboard");
  return true;
}

export async function listReadyToDispensePosOrders() {
  const session = await requireRoles("ADMIN", "PHARM_TECH");
  const orgId = session.user.organizationId;

  const ddaSet = await getDdaCategorySetForOrg(orgId);

  const orders = await prisma.posOrder.findMany({
    where: { organizationId: orgId, status: PosOrderStatus.READY_TO_DISPENSE },
    orderBy: [{ sentToDispenseAt: "asc" }, { createdAt: "asc" }],
    include: {
      patient: { select: { fullName: true, phone: true } },
      createdBy: { select: { name: true, email: true } },
      pickedBy: { select: { name: true, email: true } },
      sale: true,
      lines: {
        include: {
          drug: {
            select: {
              genericName: true,
              categories: ddaSet ? { select: { categoryId: true } } : false,
            },
          },
        },
      },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    organizationId: o.organizationId,
    orderNumber: o.orderNumber,
    status: o.status,
    patientId: o.patientId,
    prescriptionPhotoUrl: o.prescriptionPhotoUrl,
    hasDda: o.lines.some((l) => drugIsDda(ddaSet, l.drug.categories)),
    selectedPaymentMethod: o.selectedPaymentMethod,
    discountCodesSnapshot: o.discountCodesSnapshot,
    paymentQueueSnapshot: o.paymentQueueSnapshot,
    selectedInsuranceSchemeId: o.selectedInsuranceSchemeId,
    subtotalSnapshot: decToString(o.subtotalSnapshot),
    discountAmountSnapshot: decToString(o.discountAmountSnapshot),
    taxAmountSnapshot: decToString(o.taxAmountSnapshot),
    totalSnapshot: decToString(o.totalSnapshot),
    taxableAmountSnapshot: decToString(o.taxableAmountSnapshot),
    taxRateSnapshot: decToString(o.taxRateSnapshot),
    vatEnabledSnapshot: o.vatEnabledSnapshot,
    createdById: o.createdById,
    pickedById: o.pickedById,
    pickedUpAt: o.pickedUpAt?.toISOString() ?? null,
    finalizedAt: o.finalizedAt?.toISOString() ?? null,
    sentToDispenseAt: o.sentToDispenseAt?.toISOString() ?? null,
    dispensedAt: o.dispensedAt?.toISOString() ?? null,
    saleId: o.saleId,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    patient: o.patient,
    createdBy: o.createdBy,
    pickedBy: o.pickedBy,
    sale: o.sale
      ? {
          id: o.sale.id,
          saleNumber: o.sale.saleNumber,
          createdAt: o.sale.createdAt.toISOString(),
          total: decToString(o.sale.total),
        }
      : null,
    lines: o.lines.map((l) => ({
      id: l.id,
      posOrderId: l.posOrderId,
      drugId: l.drugId,
      quantity: l.quantity,
      useInsurancePrice: l.useInsurancePrice,
      directionsOverride: l.directionsOverride,
      unitPriceSnapshot: decToString(l.unitPriceSnapshot),
      lineTotalSnapshot: decToString(l.lineTotalSnapshot),
      drug: l.drug,
    })),
  }));
}

export async function markPosOrderDispensed(posOrderId: string) {
  const session = await requireRoles("ADMIN", "PHARM_TECH");
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const updated = await prisma.posOrder.updateMany({
    where: {
      id: posOrderId,
      organizationId: orgId,
      status: PosOrderStatus.READY_TO_DISPENSE,
    },
    data: {
      status: PosOrderStatus.DISPENSED,
      dispensedAt: new Date(),
    },
  });

  if (updated.count === 0) throw new Error("Order is not ready to mark dispensed.");

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "pos_order.dispense",
    entityType: "PosOrder",
    entityId: posOrderId,
  });

  revalidatePath("/pos/dispense");
  revalidatePath("/dashboard");
  return true;
}
