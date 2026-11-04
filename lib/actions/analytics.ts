"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, PaymentMethod } from "@prisma/client";
import { z } from "zod";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

const bucketEnum = z.enum(["day", "week", "month", "year"]);

const analyticsFiltersSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  preset: z
    .enum(["today", "7d", "30d", "week", "month", "year", "custom"])
    .optional()
    .default("today"),
  bucket: bucketEnum.optional().default("day"),

  includeVoided: z.coerce.boolean().optional().default(false),

  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  insuranceSchemeId: z.string().cuid().optional(),
  cashierId: z.string().cuid().optional(),

  expiryWithinDays: z.coerce.number().int().min(1).max(365).optional().default(90),
  topN: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;

export type AnalyticsBucket = z.infer<typeof bucketEnum>;

type TimePoint = {
  bucketStart: string;
  bucketEnd: string;
  revenue: number;
  transactions: number;
  cogs: number;
  grossProfit: number;
  openingStockValueCost: number;
  closingStockValueCost: number;
  openingStockValueSelling: number;
  closingStockValueSelling: number;
};

export type AdminAnalyticsReport = {
  range: { from: string; to: string; bucket: AnalyticsBucket };
  kpis: {
    revenue: number;
    transactions: number;
    avgSale: number;
    unitsSold: number;
    cogs: number;
    grossProfit: number;
    grossMarginPct: number | null;
  };
  payments: {
    summary: {
      cashReceived: number;
      mpesaReceived: number;
      insuranceReceived: number;
      insurancePending: number;
    };
    byMethod: { method: PaymentMethod; amount: number }[];
    insuranceByScheme: { schemeId: string; schemeName: string; amount: number }[];
    insurancePendingAmount: number;
  };
  sales: {
    topSelling: { drugId: string; name: string; units: number; revenue: number }[];
    repeat: {
      uniquePatients: number;
      repeatPatients: number;
      repeatRatePct: number | null;
    };
  };
  categories: {
    topByRevenue: { categoryId: string | null; categoryName: string; revenue: number; units: number }[];
    topByUnits: { categoryId: string | null; categoryName: string; revenue: number; units: number }[];
  };
  stock: {
    lowStock: { count: number; rows: { batchId: string; drug: string; batch: string; qty: number; reorderLevel: number | null }[] };
    expiringSoon: { withinDays: number; count: number; rows: { batchId: string; drug: string; batch: string; expiry: string; qty: number }[] };
    expiryBuckets: { label: string; count: number }[];
    stockValue: {
      openingCost: number;
      closingCost: number;
      openingSelling: number;
      closingSelling: number;
    };
  };
  series: {
    points: TimePoint[];
  };
  insights: {
    deterministic: string[];
  };
};

function parseRange(input: AnalyticsFilters): { from: Date; to: Date } {
  const now = new Date();

  if (input.preset === "custom" && input.from && input.to) {
    return { from: new Date(input.from), to: new Date(input.to) };
  }

  if (input.preset === "today") {
    const from = startOfDay(now);
    return { from, to: endOfDay(now) };
  }

  if (input.preset === "7d") {
    const to = endOfDay(now);
    const from = startOfDay(addDays(to, -6));
    return { from, to };
  }

  if (input.preset === "week") {
    const from = startOfWeek(now, { weekStartsOn: 1 });
    return { from, to: endOfWeek(now, { weekStartsOn: 1 }) };
  }

  if (input.preset === "month") {
    const from = startOfMonth(now);
    return { from, to: endOfMonth(now) };
  }

  if (input.preset === "year") {
    const from = startOfYear(now);
    return { from, to: endOfYear(now) };
  }

  // default today
  const from = startOfDay(now);
  return { from, to: endOfDay(now) };
}

function bucketSql(bucket: AnalyticsBucket): Prisma.Sql {
  // date_trunc expects a TEXT "field" argument; pass it as a parameterized value.
  return Prisma.sql`${bucket}`;
}

function stepBucket(d: Date, bucket: AnalyticsBucket): Date {
  switch (bucket) {
    case "day":
      return addDays(d, 1);
    case "week":
      return addWeeks(d, 1);
    case "month":
      return addMonths(d, 1);
    case "year":
      return addYears(d, 1);
  }
}

function alignBucketStart(d: Date, bucket: AnalyticsBucket): Date {
  switch (bucket) {
    case "day":
      return startOfDay(d);
    case "week":
      return startOfWeek(d, { weekStartsOn: 1 });
    case "month":
      return startOfMonth(d);
    case "year":
      return startOfYear(d);
  }
}

function alignBucketEnd(d: Date, bucket: AnalyticsBucket): Date {
  switch (bucket) {
    case "day":
      return endOfDay(d);
    case "week":
      return endOfWeek(d, { weekStartsOn: 1 });
    case "month":
      return endOfMonth(d);
    case "year":
      return endOfYear(d);
  }
}

function money(n: unknown): number {
  if (n == null) return 0;
  if (typeof n === "number") return n;
  if (typeof n === "string") return Number(n);
  if (n instanceof Prisma.Decimal) return Number(n.toString());
  return Number(n);
}

export async function getAdminAnalyticsReport(raw: unknown): Promise<AdminAnalyticsReport | null> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") return null;
  const orgId = session.user.organizationId;

  const filters = analyticsFiltersSchema.parse(raw ?? {});
  const { from, to } = parseRange(filters);
  const bucket = filters.bucket;

  const baseSaleWhere: Prisma.SaleWhereInput = {
    organizationId: orgId,
    createdAt: { gte: from, lte: to },
    ...(filters.includeVoided ? {} : { status: "COMPLETED" }),
    ...(filters.cashierId ? { createdById: filters.cashierId } : {}),
  };

  const paymentFilter: Pick<
    Prisma.PaymentWhereInput,
    "method" | "insuranceSchemeId"
  > = {
    ...(filters.paymentMethod ? { method: filters.paymentMethod } : {}),
    ...(filters.insuranceSchemeId
      ? { insuranceSchemeId: filters.insuranceSchemeId }
      : {}),
  };

  const saleWhere: Prisma.SaleWhereInput = {
    ...baseSaleWhere,
    ...(filters.paymentMethod || filters.insuranceSchemeId
      ? { payments: { some: paymentFilter } }
      : {}),
  };

  const paymentWhere: Prisma.PaymentWhereInput = {
    sale: baseSaleWhere,
    ...paymentFilter,
  };

  const paymentWhereCompleted: Prisma.PaymentWhereInput = {
    ...paymentWhere,
    status: "COMPLETED",
  };

  const [
    revenueAgg,
    txnCount,
    unitsAgg,
    paymentsByMethod,
    cashAgg,
    mpesaAgg,
    insurancePaidAgg,
    insurancePendingAgg,
  ] =
    await Promise.all([
      prisma.sale.aggregate({
        where: saleWhere,
        _sum: { total: true },
      }),
      prisma.sale.count({ where: saleWhere }),
      prisma.saleLine.aggregate({
        where: { sale: saleWhere },
        _sum: { quantity: true },
      }),
      prisma.payment.groupBy({
        by: ["method"],
        where: paymentWhereCompleted,
        _sum: { amount: true },
        orderBy: { method: "asc" },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentWhereCompleted,
          method: "CASH",
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentWhereCompleted,
          method: { in: ["MPESA_STK", "MPESA_MANUAL"] },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentWhereCompleted,
          method: "INSURANCE",
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentWhere,
          method: "INSURANCE",
          status: "PENDING",
        },
        _sum: { amount: true },
      }),
    ]);

  const revenue = money(revenueAgg._sum.total);
  const unitsSold = unitsAgg._sum.quantity ?? 0;
  const avgSale = txnCount > 0 ? revenue / txnCount : 0;

  const insuranceBySchemeRows = await prisma.payment.groupBy({
    by: ["insuranceSchemeId"],
    where: {
      ...paymentWhere,
      method: "INSURANCE",
      insuranceSchemeId: { not: null },
    },
    _sum: { amount: true },
    orderBy: { insuranceSchemeId: "asc" },
  });
  const schemeIds = insuranceBySchemeRows
    .map((r) => r.insuranceSchemeId)
    .filter((x): x is string => Boolean(x));
  const schemes = schemeIds.length
    ? await prisma.insuranceScheme.findMany({
        where: { id: { in: schemeIds }, organizationId: orgId },
        select: { id: true, name: true },
      })
    : [];
  const schemeMap = Object.fromEntries(schemes.map((s) => [s.id, s.name]));

  const topN = filters.topN;
  const topLines = await prisma.saleLine.groupBy({
    by: ["drugId"],
    where: { sale: saleWhere },
    _sum: { quantity: true, lineTotal: true },
    orderBy: [{ _sum: { quantity: "desc" } }],
    take: topN,
  });
  const topDrugIds = topLines.map((t) => t.drugId);
  const topDrugRows = topDrugIds.length
    ? await prisma.drug.findMany({
        where: { id: { in: topDrugIds }, organizationId: orgId },
        select: { id: true, genericName: true },
      })
    : [];
  const drugNameMap = Object.fromEntries(topDrugRows.map((d) => [d.id, d.genericName]));

  // Category mix (split attribution across a drug's categories to avoid double counting).
  const categoryRows = await prisma.saleLine.groupBy({
    by: ["drugId"],
    where: { sale: saleWhere },
    _sum: { quantity: true, lineTotal: true },
  });
  const allDrugIds = categoryRows.map((r) => r.drugId);
  const categoryLinks = allDrugIds.length
    ? await prisma.drugCategoryOnDrug.findMany({
        where: {
          drugId: { in: allDrugIds },
          drug: { organizationId: orgId },
        },
        select: {
          drugId: true,
          category: { select: { id: true, name: true } },
        },
      })
    : [];
  const catsByDrug = new Map<string, { id: string; name: string }[]>();
  for (const l of categoryLinks) {
    const cur = catsByDrug.get(l.drugId) ?? [];
    cur.push(l.category);
    catsByDrug.set(l.drugId, cur);
  }

  const categoryAgg = new Map<
    string,
    { categoryId: string | null; categoryName: string; revenue: number; units: number }
  >();
  for (const r of categoryRows) {
    const rev = money(r._sum.lineTotal);
    const units = r._sum.quantity ?? 0;
    const cats = catsByDrug.get(r.drugId) ?? [];
    if (cats.length === 0) {
      const key = "__other__";
      const existing = categoryAgg.get(key) ?? {
        categoryId: null,
        categoryName: "Other",
        revenue: 0,
        units: 0,
      };
      existing.revenue += rev;
      existing.units += units;
      categoryAgg.set(key, existing);
      continue;
    }
    const shareRev = rev / cats.length;
    const shareUnits = units / cats.length;
    for (const c of cats) {
      const key = c.id;
      const existing = categoryAgg.get(key) ?? {
        categoryId: c.id,
        categoryName: c.name,
        revenue: 0,
        units: 0,
      };
      existing.revenue += shareRev;
      existing.units += shareUnits;
      categoryAgg.set(key, existing);
    }
  }
  const categoryList = Array.from(categoryAgg.values());
  const topCategoriesByRevenue = [...categoryList]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, Math.min(15, topN));
  const topCategoriesByUnits = [...categoryList]
    .sort((a, b) => b.units - a.units)
    .slice(0, Math.min(15, topN));

  const salesByPatient = await prisma.sale.groupBy({
    by: ["patientId"],
    where: { ...saleWhere, patientId: { not: null } },
    _count: { _all: true },
  });
  const uniquePatients = salesByPatient.length;
  const repeatPatients = salesByPatient.filter((r) => (r._count?._all ?? 0) >= 2).length;
  const repeatRatePct =
    uniquePatients > 0 ? (repeatPatients / uniquePatients) * 100 : null;

  // Stock alerts
  const expiryWithinDays = filters.expiryWithinDays;
  const expiryStart = startOfDay(new Date());
  const expiryCutoff = addDays(expiryStart, expiryWithinDays);
  const [lowStockRaw, expiringSoonCount, expiringSoonBatches, expiryBucketRaw] = await Promise.all([
    prisma.$queryRaw<
      {
        batchId: string;
        drug: string;
        batch: string;
        qty: number;
        reorderLevel: number | null;
      }[]
    >(Prisma.sql`
      SELECT
        db."id" AS "batchId",
        d."genericName" AS "drug",
        db."batchNumber" AS "batch",
        db."quantityOnHand" AS "qty",
        d."reorderLevel" AS "reorderLevel"
      FROM "DrugBatch" db
      JOIN "Drug" d ON d."id" = db."drugId"
      WHERE db."organizationId" = ${orgId}
        AND db."deletedAt" IS NULL
        AND d."reorderLevel" IS NOT NULL
        AND db."quantityOnHand" <= d."reorderLevel"
      ORDER BY db."quantityOnHand" ASC, d."genericName" ASC
      LIMIT 20
    `),
    prisma.drugBatch.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        expiryDate: { gte: expiryStart, lte: expiryCutoff },
        quantityOnHand: { gt: 0 },
      },
    }),
    prisma.drugBatch.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        expiryDate: { gte: expiryStart, lte: expiryCutoff },
        quantityOnHand: { gt: 0 },
      },
      orderBy: { expiryDate: "asc" },
      take: 20,
      include: { drug: { select: { genericName: true } } },
    }),
    prisma.$queryRaw<{ bucket: string; count: bigint }[]>(Prisma.sql`
      SELECT
        CASE
          WHEN db."expiryDate" < NOW() THEN 'Expired'
          WHEN db."expiryDate" <= NOW() + INTERVAL '30 days' THEN '0–30 days'
          WHEN db."expiryDate" <= NOW() + INTERVAL '60 days' THEN '31–60 days'
          WHEN db."expiryDate" <= NOW() + INTERVAL '90 days' THEN '61–90 days'
          ELSE '91+ days'
        END AS bucket,
        COUNT(*) AS count
      FROM "DrugBatch" db
      WHERE db."organizationId" = ${orgId}
        AND db."deletedAt" IS NULL
        AND db."quantityOnHand" > 0
      GROUP BY 1
      ORDER BY 1
    `),
  ]);
  const lowStockRows = lowStockRaw.map((r) => ({
    batchId: r.batchId,
    drug: r.drug,
    batch: r.batch,
    qty: r.qty,
    reorderLevel: r.reorderLevel,
  }));

  const expiringRows = expiringSoonBatches.map((b) => ({
    batchId: b.id,
    drug: b.drug.genericName,
    batch: b.batchNumber,
    expiry: b.expiryDate.toISOString(),
    qty: b.quantityOnHand,
  }));

  const expiryBucketCounts = (() => {
    const counts: Record<string, number> = {};
    for (const r of expiryBucketRaw) {
      counts[r.bucket] = Number(r.count);
    }
    const ordered = ["Expired", "0–30 days", "31–60 days", "61–90 days", "91+ days"];
    return ordered.map((label) => ({ label, count: counts[label] ?? 0 }));
  })();

  const paymentExistsSql =
    filters.paymentMethod || filters.insuranceSchemeId
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM "Payment" p
          WHERE p."saleId" = s."id"
            ${filters.paymentMethod ? Prisma.sql`AND p."method" = ${filters.paymentMethod}` : Prisma.sql``}
            ${filters.insuranceSchemeId ? Prisma.sql`AND p."insuranceSchemeId" = ${filters.insuranceSchemeId}` : Prisma.sql``}
        )
      `
      : Prisma.sql``;

  // Revenue/txn series (bucketed)
  const saleSeries = await prisma.$queryRaw<
    { bucket: Date; revenue: Prisma.Decimal; transactions: bigint }[]
  >(Prisma.sql`
    SELECT
      date_trunc(${bucketSql(bucket)}, s."createdAt") AS bucket,
      SUM(s."total") AS revenue,
      COUNT(*) AS transactions
    FROM "Sale" s
    WHERE s."organizationId" = ${orgId}
      AND s."createdAt" >= ${from}
      AND s."createdAt" <= ${to}
      ${filters.includeVoided ? Prisma.sql`` : Prisma.sql`AND s."status" = 'COMPLETED'`}
      ${filters.cashierId ? Prisma.sql`AND s."createdById" = ${filters.cashierId}` : Prisma.sql``}
      ${paymentExistsSql}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  // COGS series (bucketed by sale createdAt, using allocations and batch cost)
  const cogsSeries = await prisma.$queryRaw<
    { bucket: Date; cogs: Prisma.Decimal }[]
  >(Prisma.sql`
    SELECT
      date_trunc(${bucketSql(bucket)}, s."createdAt") AS bucket,
      SUM(slba."quantity" * COALESCE(db."unitCost", d."costLast", 0)) AS cogs
    FROM "Sale" s
    JOIN "SaleLine" sl ON sl."saleId" = s."id"
    JOIN "SaleLineBatch" slba ON slba."saleLineId" = sl."id"
    JOIN "DrugBatch" db ON db."id" = slba."batchId"
    JOIN "Drug" d ON d."id" = sl."drugId"
    WHERE s."organizationId" = ${orgId}
      AND s."createdAt" >= ${from}
      AND s."createdAt" <= ${to}
      ${filters.includeVoided ? Prisma.sql`` : Prisma.sql`AND s."status" = 'COMPLETED'`}
      ${filters.cashierId ? Prisma.sql`AND s."createdById" = ${filters.cashierId}` : Prisma.sql``}
      ${paymentExistsSql}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  const saleSeriesMap = new Map<string, { revenue: number; transactions: number }>();
  for (const r of saleSeries) {
    saleSeriesMap.set(r.bucket.toISOString(), {
      revenue: money(r.revenue),
      transactions: Number(r.transactions),
    });
  }
  const cogsSeriesMap = new Map<string, number>();
  for (const r of cogsSeries) {
    cogsSeriesMap.set(r.bucket.toISOString(), money(r.cogs));
  }

  // Stock value series (cost + selling) using movement deltas per bucket, computed backwards from end-of-range.
  const batches = await prisma.drugBatch.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: {
      id: true,
      quantityOnHand: true,
      unitCost: true,
      drug: { select: { priceCash: true, costLast: true } },
    },
  });

  const [deltaAfterToRows, deltaAfterFromRows] = await Promise.all([
    prisma.stockMovement.groupBy({
      by: ["batchId"],
      where: { organizationId: orgId, createdAt: { gt: to } },
      _sum: { quantity: true },
    }),
    prisma.stockMovement.groupBy({
      by: ["batchId"],
      where: { organizationId: orgId, createdAt: { gt: from } },
      _sum: { quantity: true },
    }),
  ]);

  const deltaAfterToMap = new Map<string, number>();
  for (const r of deltaAfterToRows) {
    deltaAfterToMap.set(r.batchId, r._sum.quantity ?? 0);
  }

  const deltaAfterFromMap = new Map<string, number>();
  for (const r of deltaAfterFromRows) {
    deltaAfterFromMap.set(r.batchId, r._sum.quantity ?? 0);
  }

  const endQtyAtTo = new Map<string, number>();
  const batchCost = new Map<string, number>();
  const batchSell = new Map<string, number>();

  let closingCost = 0;
  let closingSelling = 0;
  let openingCostExact = 0;
  let openingSellingExact = 0;

  for (const b of batches) {
    const cost = money(b.unitCost) || money(b.drug.costLast);
    const sell = money(b.drug.priceCash);
    const endQty = b.quantityOnHand - (deltaAfterToMap.get(b.id) ?? 0);
    const startQty = b.quantityOnHand - (deltaAfterFromMap.get(b.id) ?? 0);
    endQtyAtTo.set(b.id, endQty);
    batchCost.set(b.id, cost);
    batchSell.set(b.id, sell);
    closingCost += endQty * cost;
    closingSelling += endQty * sell;
    openingCostExact += startQty * cost;
    openingSellingExact += startQty * sell;
  }

  const movementDeltas = await prisma.$queryRaw<
    { bucket: Date; batchId: string; qtyDelta: bigint }[]
  >(Prisma.sql`
    SELECT
      date_trunc(${bucketSql(bucket)}, sm."createdAt") AS bucket,
      sm."batchId" AS "batchId",
      SUM(sm."quantity") AS "qtyDelta"
    FROM "StockMovement" sm
    WHERE sm."organizationId" = ${orgId}
      AND sm."createdAt" >= ${from}
      AND sm."createdAt" <= ${to}
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);

  const deltasByBucket = new Map<string, { batchId: string; delta: number }[]>();
  for (const r of movementDeltas) {
    const key = r.bucket.toISOString();
    const list = deltasByBucket.get(key) ?? [];
    list.push({ batchId: r.batchId, delta: Number(r.qtyDelta) });
    deltasByBucket.set(key, list);
  }

  // Build bucket sequence aligned to calendar boundaries (matches date_trunc buckets)
  const alignedFrom = alignBucketStart(from, bucket);
  const alignedTo = alignBucketEnd(to, bucket);

  const bucketStarts: Date[] = [];
  for (let cur = alignedFrom; cur <= alignedTo; cur = stepBucket(cur, bucket)) {
    bucketStarts.push(cur);
  }

  const bucketEnds: Date[] = bucketStarts.map((s, idx) => {
    const next = bucketStarts[idx + 1];
    return next ? new Date(next.getTime() - 1) : alignedTo;
  });

  const qtyMap = new Map(endQtyAtTo);
  let runningClosingCost = closingCost;
  let runningClosingSelling = closingSelling;

  const pointsDesc: TimePoint[] = [];

  for (let i = bucketStarts.length - 1; i >= 0; i--) {
    const bs = bucketStarts[i]!;
    const be = bucketEnds[i]!;
    const bucketKey = alignBucketStart(bs, bucket).toISOString();

    const closingBucketCost = runningClosingCost;
    const closingBucketSelling = runningClosingSelling;

    // Undo movements inside this bucket to get opening values
    const deltas = deltasByBucket.get(bucketKey) ?? [];
    for (const d of deltas) {
      const prevQty = qtyMap.get(d.batchId) ?? 0;
      const nextQty = prevQty - d.delta;
      qtyMap.set(d.batchId, nextQty);
      const cost = batchCost.get(d.batchId) ?? 0;
      const sell = batchSell.get(d.batchId) ?? 0;
      runningClosingCost -= d.delta * cost;
      runningClosingSelling -= d.delta * sell;
    }

    const openingBucketCost = runningClosingCost;
    const openingBucketSelling = runningClosingSelling;

    const seriesKey = alignBucketStart(bs, bucket).toISOString();
    const s = saleSeriesMap.get(seriesKey);
    const revenuePoint = s?.revenue ?? 0;
    const txPoint = s?.transactions ?? 0;
    const cogsPoint = cogsSeriesMap.get(seriesKey) ?? 0;
    const grossProfitPoint = revenuePoint - cogsPoint;

    pointsDesc.push({
      bucketStart: bs.toISOString(),
      bucketEnd: be.toISOString(),
      revenue: revenuePoint,
      transactions: txPoint,
      cogs: cogsPoint,
      grossProfit: grossProfitPoint,
      openingStockValueCost: openingBucketCost,
      closingStockValueCost: closingBucketCost,
      openingStockValueSelling: openingBucketSelling,
      closingStockValueSelling: closingBucketSelling,
    });
  }

  const points = pointsDesc.reverse();
  const totalCogs = points.reduce((s, p) => s + p.cogs, 0);
  const grossProfit = revenue - totalCogs;
  const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : null;

  const openingCost = openingCostExact;
  const openingSelling = openingSellingExact;

  const deterministicInsights: string[] = [];
  if (txnCount > 0) {
    deterministicInsights.push(
      `Average sale value is KES ${avgSale.toFixed(2)} across ${txnCount} transaction${txnCount === 1 ? "" : "s"}.`,
    );
  }
  if (lowStockRows.length > 0) {
    deterministicInsights.push(`There are ${lowStockRows.length} low-stock batch${lowStockRows.length === 1 ? "" : "es"} to review.`);
  }
  if (expiringRows.length > 0) {
    deterministicInsights.push(`There are ${expiringRows.length} batches expiring within ${expiryWithinDays} days with stock on hand.`);
  }

  return {
    range: { from: from.toISOString(), to: to.toISOString(), bucket },
    kpis: {
      revenue,
      transactions: txnCount,
      avgSale,
      unitsSold,
      cogs: totalCogs,
      grossProfit,
      grossMarginPct,
    },
    payments: {
      summary: {
        cashReceived: money(cashAgg._sum.amount),
        mpesaReceived: money(mpesaAgg._sum.amount),
        insuranceReceived: money(insurancePaidAgg._sum.amount),
        insurancePending: money(insurancePendingAgg._sum.amount),
      },
      byMethod: paymentsByMethod.map((r) => ({
        method: r.method,
        amount: money(r._sum.amount),
      })),
      insuranceByScheme: insuranceBySchemeRows
        .filter((r) => r.insuranceSchemeId)
        .map((r) => ({
          schemeId: r.insuranceSchemeId as string,
          schemeName: schemeMap[r.insuranceSchemeId as string] ?? "Unknown",
          amount: money(r._sum.amount),
        })),
      insurancePendingAmount: money(insurancePendingAgg._sum.amount),
    },
    sales: {
      topSelling: topLines.map((t) => ({
        drugId: t.drugId,
        name: drugNameMap[t.drugId] ?? t.drugId,
        units: t._sum.quantity ?? 0,
        revenue: money(t._sum.lineTotal),
      })),
      repeat: {
        uniquePatients,
        repeatPatients,
        repeatRatePct,
      },
    },
    categories: {
      topByRevenue: topCategoriesByRevenue,
      topByUnits: topCategoriesByUnits,
    },
    stock: {
      lowStock: { count: lowStockRows.length, rows: lowStockRows },
      expiringSoon: {
        withinDays: expiryWithinDays,
        count: expiringSoonCount,
        rows: expiringRows,
      },
      expiryBuckets: expiryBucketCounts,
      stockValue: {
        openingCost,
        closingCost,
        openingSelling,
        closingSelling,
      },
    },
    series: { points },
    insights: { deterministic: deterministicInsights },
  };
}

