"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DiscountScopeType, DiscountValueType, Prisma } from "@prisma/client";
import { z } from "zod";

const quoteSchema = z.object({
  patientId: z.string().optional().nullable(),
  taxRatePercent: z.coerce.number().min(0).max(100),
  lines: z
    .array(
      z.object({
        drugId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        useInsurancePrice: z.boolean().optional(),
      }),
    )
    .min(1),
  codes: z.array(z.string().min(1)).default([]),
});

type QuoteAppliedDiscount = {
  code: string;
  name: string;
  appliedAmount: number;
};

function decMin(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.lte(b) ? a : b;
}

function decMax(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.gte(b) ? a : b;
}

export async function quoteDiscountsForPos(raw: unknown): Promise<{
  subtotalBeforeDiscount: number;
  discountAmount: number;
  taxableSubtotal: number;
  taxAmount: number;
  total: number;
  applied: QuoteAppliedDiscount[];
  rejected: { code: string; reason: string }[];
}> {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  const orgId = session.user.organizationId;

  const parsed = quoteSchema.parse(raw);

  const codeInputs = parsed.codes
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  const codesUnique: string[] = [];
  for (const c of codeInputs) {
    if (!codesUnique.includes(c)) codesUnique.push(c);
  }

  const now = new Date();

  const drugs = await prisma.drug.findMany({
    where: { organizationId: orgId, id: { in: parsed.lines.map((l) => l.drugId) } },
    select: { id: true, priceCash: true, priceInsurance: true, status: true },
  });
  const drugById = new Map(drugs.map((d) => [d.id, d]));

  const resolvedLines: {
    drugId: string;
    baseAmount: Prisma.Decimal;
  }[] = [];
  let subtotal = new Prisma.Decimal(0);

  for (const l of parsed.lines) {
    const d = drugById.get(l.drugId);
    if (!d || d.status !== "ACTIVE") {
      throw new Error(`Drug unavailable: ${l.drugId}`);
    }
    const unit = l.useInsurancePrice ? d.priceInsurance : d.priceCash;
    const lineTotal = new Prisma.Decimal(unit).mul(l.quantity);
    resolvedLines.push({ drugId: l.drugId, baseAmount: lineTotal });
    subtotal = subtotal.add(lineTotal);
  }

  const rejected: { code: string; reason: string }[] = [];
  if (codesUnique.length === 0) {
    const taxRate = new Prisma.Decimal(parsed.taxRatePercent).div(100);
    const taxAmount = subtotal.mul(taxRate);
    const total = subtotal.add(taxAmount);
    return {
      subtotalBeforeDiscount: Number(subtotal),
      discountAmount: 0,
      taxableSubtotal: Number(subtotal),
      taxAmount: Number(taxAmount),
      total: Number(total),
      applied: [],
      rejected,
    };
  }

  const found = await prisma.discountCode.findMany({
    where: { organizationId: orgId, code: { in: codesUnique } },
    include: { drugs: true, patients: true },
  });
  const byCode = new Map(found.map((d) => [d.code, d]));

  // Precompute new/returning for segment checks.
  const patientId = parsed.patientId ?? null;
  let priorCompletedSalesCount: number | null = null;
  if (patientId) {
    priorCompletedSalesCount = await prisma.sale.count({
      where: { organizationId: orgId, patientId, status: "COMPLETED" },
    });
  }

  // Line-level remaining amounts, so stacked discounts cannot go below 0.
  const remaining = resolvedLines.map((l) => new Prisma.Decimal(l.baseAmount));

  function eligibleLineIndexesFor(code: (typeof found)[number]) {
    if (code.scopeType === DiscountScopeType.ALL_DRUGS) {
      return remaining.map((_, i) => i);
    }
    const set = new Set(code.drugs.map((d) => d.drugId));
    const idx: number[] = [];
    for (let i = 0; i < resolvedLines.length; i++) {
      if (set.has(resolvedLines[i]!.drugId)) idx.push(i);
    }
    return idx;
  }

  function sumRemaining(ix: number[]) {
    return ix.reduce((acc, i) => acc.add(remaining[i] ?? 0), new Prisma.Decimal(0));
  }

  function distributeDiscount(ix: number[], amount: Prisma.Decimal) {
    // Distribute proportionally across remaining eligible lines.
    const eligibleSum = sumRemaining(ix);
    if (eligibleSum.lte(0)) return;
    let toApply = new Prisma.Decimal(amount);
    for (let k = 0; k < ix.length; k++) {
      const i = ix[k]!;
      const r = remaining[i]!;
      if (r.lte(0)) continue;
      const isLast = k === ix.length - 1;
      const share = isLast
        ? toApply
        : toApply.mul(r).div(eligibleSum);
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

  // Deterministic order: priority desc, percent before fixed, code asc.
  eligibleCodes.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const at = a.valueType === DiscountValueType.PERCENT ? 0 : 1;
    const bt = b.valueType === DiscountValueType.PERCENT ? 0 : 1;
    if (at !== bt) return at - bt;
    return a.code.localeCompare(b.code);
  });

  const applied: QuoteAppliedDiscount[] = [];
  let totalDiscount = new Prisma.Decimal(0);

  for (const d of eligibleCodes) {
    const ix = eligibleLineIndexesFor(d);
    const eligibleRemaining = sumRemaining(ix);
    if (eligibleRemaining.lte(0)) continue;

    let discount = new Prisma.Decimal(0);
    if (d.valueType === DiscountValueType.PERCENT) {
      const pct = d.valuePercent ? new Prisma.Decimal(d.valuePercent).div(100) : new Prisma.Decimal(0);
      discount = eligibleRemaining.mul(pct);
    } else {
      const amt = d.valueAmount ? new Prisma.Decimal(d.valueAmount) : new Prisma.Decimal(0);
      discount = decMin(amt, eligibleRemaining);
    }

    if (discount.lte(0)) continue;
    distributeDiscount(ix, discount);
    totalDiscount = totalDiscount.add(discount);
    applied.push({
      code: d.code,
      name: d.name,
      appliedAmount: Number(discount),
    });
  }

  const taxableSubtotal = decMax(
    new Prisma.Decimal(0),
    subtotal.sub(totalDiscount),
  );
  const taxRate = new Prisma.Decimal(parsed.taxRatePercent).div(100);
  const taxAmount = taxableSubtotal.mul(taxRate);
  const total = taxableSubtotal.add(taxAmount);

  return {
    subtotalBeforeDiscount: Number(subtotal),
    discountAmount: Number(totalDiscount),
    taxableSubtotal: Number(taxableSubtotal),
    taxAmount: Number(taxAmount),
    total: Number(total),
    applied,
    rejected,
  };
}

