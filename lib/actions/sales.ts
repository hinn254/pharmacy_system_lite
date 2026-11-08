"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { allocateFefo } from "@/lib/fefo";
import { createSaleSchema, type CreateSaleInput } from "@/lib/validations/sale";
import { captureServerEvent } from "@/lib/analytics/server";
import { countBucket } from "@/lib/analytics/events";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { PaymentMethod, PaymentStatus, EtimsComplianceStatus } from "@prisma/client";

export async function getNextSalePreview() {
  const session = await auth();
  if (!session?.user?.organizationId) return null;
  const orgId = session.user.organizationId;
  const last = await prisma.sale.findFirst({
    where: { organizationId: orgId },
    orderBy: { saleNumber: "desc" },
    select: { saleNumber: true },
  });
  return (last?.saleNumber ?? 0) + 1;
}

export async function createSaleFromParsed(params: {
  parsed: CreateSaleInput;
  orgId: string;
  userId: string;
  /** When true, replaces payment amounts with the computed sale total (single payment only). */
  syncPaymentAmountsToComputedTotal?: boolean;
}) {
  const { parsed, orgId, userId, syncPaymentAmountsToComputedTotal } = params;

  for (const p of parsed.payments) {
    if (p.method === PaymentMethod.INSURANCE && !p.insuranceSchemeId?.trim()) {
      throw new Error("Select an insurance scheme for insurance payments.");
    }
  }

  const settings = await prisma.organizationSettings.findUnique({
    where: { orgId },
  });
  const applyTax = parsed.applyTax ?? true;
  // Always snapshot the org-configured VAT rate (dynamic from DB; defaults to schema default 16%)
  const configuredTaxRatePercent = settings
    ? new Prisma.Decimal(settings.taxRatePercent)
    : new Prisma.Decimal(16);
  const configuredTaxRate = configuredTaxRatePercent.div(100);
  // Effective VAT rate can be toggled off per sale.
  const taxRate = applyTax ? configuredTaxRate : new Prisma.Decimal(0);

  const sale = await prisma.$transaction(async (tx) => {
    let subtotal = new Prisma.Decimal(0);
    const linePayloads: {
      drugId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      useInsurance: boolean;
      patientDirections: string;
      directionsOverride: string | null;
      allocations: { batchId: string; quantity: number }[];
    }[] = [];

    for (const line of parsed.lines) {
      const directionsOverride =
        line.instructions?.trim() ? line.instructions.trim() : null;
      const drug = await tx.drug.findFirst({
        where: { id: line.drugId, organizationId: orgId },
      });
      if (!drug || drug.status !== "ACTIVE") {
        throw new Error(`Drug unavailable: ${line.drugId}`);
      }
      const useInsurance = line.useInsurancePrice ?? false;
      const unitPrice = useInsurance
        ? drug.priceInsurance
        : drug.priceCash;
      const lineTotal = new Prisma.Decimal(unitPrice).mul(line.quantity);
      subtotal = subtotal.add(lineTotal);

      const allocations = await allocateFefo(
        tx,
        orgId,
        line.drugId,
        line.quantity,
      );
      linePayloads.push({
        drugId: line.drugId,
        quantity: line.quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        lineTotal,
        useInsurance: useInsurance,
        patientDirections: directionsOverride ?? drug.patientDirections ?? "",
        directionsOverride,
        allocations,
      });
    }

    const codesUnique = (parsed.discountCodes ?? [])
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean)
      .filter((c, i, arr) => arr.indexOf(c) === i);

    const now = new Date();
    const patientId = parsed.patientId || null;

    let priorCompletedSalesCount: number | null = null;
    if (patientId) {
      priorCompletedSalesCount = await tx.sale.count({
        where: { organizationId: orgId, patientId, status: "COMPLETED" },
      });
    }

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
      if (d.scopeType === "ALL_DRUGS") {
        return remaining.map((_, i) => i);
      }
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
          if (!patientId) {
            rejected.push({ code: d.code, reason: "Patient required" });
            return false;
          }
          const count = priorCompletedSalesCount ?? 0;
          const isNew = count === 0;
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
          if (!patientId) {
            rejected.push({ code: d.code, reason: "Patient required" });
            return false;
          }
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

    const subtotalAfterDiscount = decMax(new Prisma.Decimal(0), subtotal.sub(totalDiscount));
    const totalBeforeDiscount = subtotal.add(subtotal.mul(taxRate));
    const taxAmount = subtotalAfterDiscount.mul(taxRate);
    const total = subtotalAfterDiscount.add(taxAmount);

    const paymentsEffective =
      syncPaymentAmountsToComputedTotal === true
        ? (() => {
            if (parsed.payments.length !== 1) {
              throw new Error(
                "syncPaymentAmountsToComputedTotal requires exactly one payment row.",
              );
            }
            const p0 = parsed.payments[0]!;
            const amount = Number(total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
            return [{ ...p0, amount }];
          })()
        : parsed.payments;

    const totalNum = Number(total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP));
    const paySum = paymentsEffective.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(paySum - totalNum) > 0.02) {
      throw new Error(
        `Payment total (${paySum.toFixed(2)}) must match sale total (${totalNum.toFixed(2)}).`,
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
        patientId: parsed.patientId || null,
        subtotal,
        discountAmount: totalDiscount,
        totalBeforeDiscount,
        taxAmount,
        total,
        createdById: userId,
        taxableAmount: subtotalAfterDiscount,
        taxRateSnapshot: configuredTaxRatePercent,
        etimsStatus: EtimsComplianceStatus.PENDING,
      },
    });

    if (patientId) {
      const rxNumber =
        parsed.rxNumber?.trim() ? parsed.rxNumber.trim() : `RX-${saleNumber}`;
      const prescriberName = parsed.prescriberName?.trim()
        ? parsed.prescriberName.trim()
        : "Prescription";

      await tx.prescription.create({
        data: {
          patientId,
          prescriberName,
          rxNumber,
          issuedAt: now,
          notes: `Created from POS sale #${saleNumber}`,
          items: {
            create: linePayloads.map((lp) => ({
              drugId: lp.drugId,
              quantity: lp.quantity,
              instructions: lp.patientDirections?.trim() || null,
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

    for (const p of paymentsEffective) {
      const insuranceSchemeId: string | null = p.insuranceSchemeId?.trim() || null;
      if (insuranceSchemeId) {
        const scheme = await tx.insuranceScheme.findFirst({
          where: { id: insuranceSchemeId, organizationId: orgId },
        });
        if (!scheme) {
          throw new Error("Invalid insurance scheme.");
        }
      }

      const isInsurance = p.method === PaymentMethod.INSURANCE;
      await tx.payment.create({
        data: {
          saleId: created.id,
          method: p.method as PaymentMethod,
          amount: new Prisma.Decimal(String(p.amount)),
          status: isInsurance
            ? PaymentStatus.PENDING
            : PaymentStatus.COMPLETED,
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

    return created;
  });

  return sale;
}

export async function createSale(raw: unknown) {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const parsed = createSaleSchema.parse(raw);
  const sale = await createSaleFromParsed({ parsed, orgId, userId });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "sale.create",
    entityType: "Sale",
    entityId: sale.id,
    metadata: { saleNumber: sale.saleNumber },
  });

  const paymentMethods = [...new Set(parsed.payments.map((payment) => payment.method))];
  const analyticsPaymentMethod = paymentMethods.length > 1
    ? "MIXED"
    : paymentMethods[0] === "MPESA_STK" || paymentMethods[0] === "MPESA_MANUAL"
      ? "MPESA"
      : paymentMethods[0];
  await captureServerEvent(
    { organizationId: orgId, userId, userRole: session.user.role },
    "sale_completed",
    {
      payment_method: analyticsPaymentMethod,
      item_count_bucket: countBucket(parsed.lines.length),
      workflow: "pos",
    },
  );
  if (paymentMethods.includes("INSURANCE")) {
    await captureServerEvent(
      { organizationId: orgId, userId, userRole: session.user.role },
      "insurance_claim_created",
      {},
    );
  }

  revalidatePath("/pos");
  revalidatePath("/dashboard");
  revalidatePath("/inventory/batches");
  revalidatePath("/patients");
  return sale;
}

export async function listRecentSales(limit = 20) {
  const session = await auth();
  if (!session?.user?.organizationId) return [];
  return prisma.sale.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      createdBy: { select: { name: true, email: true } },
      patient: { select: { fullName: true } },
      lines: {
        include: { drug: { select: { genericName: true } } },
      },
      payments: { include: { insuranceScheme: true } },
    },
  });
}

export async function getSaleById(id: string) {
  const session = await auth();
  if (!session?.user?.organizationId) return null;
  return prisma.sale.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      lines: {
        include: {
          drug: true,
          batchAllocations: { include: { batch: true } },
        },
      },
      serviceLines: true,
      discounts: { orderBy: { sortOrder: "asc" } },
      payments: { include: { insuranceScheme: true } },
      patient: true,
      createdBy: { select: { name: true, email: true } },
      organization: { include: { settings: true } },
    },
  });
}

function utcDayStart(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Exclusive upper bound: first instant of the day after `isoDate` (UTC). */
function utcDayEndExclusive(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function buildAdminSaleSearchWhere(
  raw: string,
): Prisma.SaleWhereInput | undefined {
  const q = raw.trim();
  if (!q) return undefined;

  const or: Prisma.SaleWhereInput[] = [];
  const digits = q.replace(/^#/u, "").trim();
  if (/^\d+$/u.test(digits)) {
    const n = Number.parseInt(digits, 10);
    if (Number.isFinite(n) && n > 0) {
      or.push({ saleNumber: n });
    }
  }

  or.push(
    {
      patient: {
        fullName: { contains: q, mode: "insensitive" },
      },
    },
    {
      createdBy: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
    },
    {
      lines: {
        some: {
          drug: { genericName: { contains: q, mode: "insensitive" } },
        },
      },
    },
  );

  return { OR: or };
}

export async function listSalesForAdmin(params?: {
  limit?: number;
  status?: "COMPLETED" | "VOIDED";
  /** Free text: invoice #, patient, cashier, drug name */
  search?: string;
  /** Inclusive start (YYYY-MM-DD, UTC calendar day). */
  dateFrom?: string;
  /** Inclusive end (YYYY-MM-DD, UTC calendar day). */
  dateTo?: string;
  paymentMethod?: PaymentMethod;
  /** Only sales that include at least one pending insurance payment */
  insurancePendingOnly?: boolean;
}) {
  const session = await auth();
  if (
    !session?.user?.organizationId ||
    !(
      session.user.role === "ADMIN" ||
      session.user.role === "CASHIER" ||
      session.user.role === "PHARM_TECH"
    )
  ) {
    return [];
  }

  const limit = Math.min(Math.max(params?.limit ?? 100, 1), 500);
  const status = params?.status ?? "COMPLETED";

  const and: Prisma.SaleWhereInput[] = [];

  const from = params?.dateFrom ? utcDayStart(params.dateFrom) : null;
  const toEx = params?.dateTo ? utcDayEndExclusive(params.dateTo) : null;
  if (from) {
    and.push({ createdAt: { gte: from } });
  }
  if (toEx) {
    and.push({ createdAt: { lt: toEx } });
  }

  const searchWhere = params?.search
    ? buildAdminSaleSearchWhere(params.search)
    : undefined;
  if (searchWhere) {
    and.push(searchWhere);
  }

  if (params?.paymentMethod) {
    and.push({
      payments: { some: { method: params.paymentMethod } },
    });
  }

  if (params?.insurancePendingOnly) {
    and.push({
      payments: {
        some: {
          method: PaymentMethod.INSURANCE,
          status: PaymentStatus.PENDING,
        },
      },
    });
  }

  return prisma.sale.findMany({
    where: {
      organizationId: session.user.organizationId,
      status,
      ...(and.length > 0 ? { AND: and } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      createdBy: { select: { name: true, email: true } },
      patient: { select: { fullName: true, phone: true, email: true } },
      lines: {
        include: {
          drug: { select: { genericName: true } },
        },
      },
      payments: { include: { insuranceScheme: true } },
    },
  });
}

export async function setInsurancePaymentSettled(paymentId: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  const orgId = session.user.organizationId;
  const userId = session.user.id;

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId },
    include: {
      sale: { select: { id: true, organizationId: true, saleNumber: true } },
    },
  });

  if (!payment || payment.sale.organizationId !== orgId) {
    throw new Error("Payment not found.");
  }
  if (payment.method !== PaymentMethod.INSURANCE) {
    throw new Error("Only insurance payments can be settled this way.");
  }
  if (payment.status !== PaymentStatus.PENDING) {
    throw new Error("Payment is not awaiting settlement.");
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.COMPLETED },
  });

  await writeAuditLog({
    organizationId: orgId,
    userId,
    action: "payment.insurance_settled",
    entityType: "Payment",
    entityId: paymentId,
    metadata: {
      saleId: payment.sale.id,
      saleNumber: payment.sale.saleNumber,
    },
  });

  revalidatePath("/admin/sales");
  revalidatePath(`/pos/receipt/${payment.sale.id}`);
  revalidatePath("/dashboard");
}
