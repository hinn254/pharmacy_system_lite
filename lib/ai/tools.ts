import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { UserRole } from "@prisma/client";
import { addDays, startOfDay, startOfWeek, subWeeks } from "date-fns";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export type ToolContext = {
  organizationId: string;
  role: UserRole;
};

export const PHARMACY_AI_MODEL = "gpt-4o-mini";

export const pharmacyTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_pharmacy_snapshot",
      description:
        "Today's completed sales total and count, low-stock batch count, and up to 10 batches expiring within 90 days with quantity.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "search_drugs",
      description:
        "Search active drugs by generic name, brand, internal code, or barcode. Returns name, codes, cash price, and total quantity on hand across batches.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text" },
          limit: { type: "integer", description: "Max results (default 15, max 25)" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stock_alerts",
      description:
        "Low-stock batches (at or below drug reorder level) and batches expiring within a number of days.",
      parameters: {
        type: "object",
        properties: {
          expiry_within_days: {
            type: "integer",
            description: "Include batches expiring within this many days (default 90, max 365)",
          },
          max_rows: { type: "integer", description: "Max rows per category (default 20, max 40)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "top_sellers_today",
      description: "Top selling drugs by quantity for completed sales today.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "integer", description: "Top N (default 10, max 20)" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analytics_last_30_days",
      description:
        "ADMIN ONLY. Total revenue, transaction count, and top 10 products by quantity in the last 30 days.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_sales_weeks",
      description:
        "ADMIN ONLY. Compare this calendar week so far vs the previous full week: revenue and sale counts.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

const searchDrugsArgs = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(25).optional(),
});

const stockAlertsArgs = z.object({
  expiry_within_days: z.number().int().min(1).max(365).optional(),
  max_rows: z.number().int().min(1).max(40).optional(),
});

const topSellersArgs = z.object({
  limit: z.number().int().min(1).max(20).optional(),
});

async function toolGetPharmacySnapshot(organizationId: string) {
  const today = startOfDay(new Date());
  const expiryCutoff = addDays(today, 90);

  const [salesToday, salesCount, lowStockBatches, expiringBatches] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: { gte: today },
        },
        _sum: { total: true },
      }),
      prisma.sale.count({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: { gte: today },
        },
      }),
      prisma.drugBatch.findMany({
        where: { organizationId, deletedAt: null },
        include: {
          drug: {
            select: {
              genericName: true,
              reorderLevel: true,
            },
          },
        },
      }),
      prisma.drugBatch.findMany({
        where: {
          organizationId,
          deletedAt: null,
          expiryDate: { gte: today, lte: expiryCutoff },
          quantityOnHand: { gt: 0 },
        },
        orderBy: { expiryDate: "asc" },
        take: 10,
        include: { drug: { select: { genericName: true } } },
      }),
    ]);

  const lowStock = lowStockBatches.filter((b) => {
    const min = b.drug.reorderLevel;
    if (min == null) return false;
    return b.quantityOnHand <= min;
  });

  return {
    sales_today_total: salesToday._sum.total?.toString() ?? "0",
    sales_today_count: salesCount,
    low_stock_batch_count: lowStock.length,
    expiring_soon_batches: expiringBatches.map((b) => ({
      drug: b.drug.genericName,
      batch: b.batchNumber,
      expiry: b.expiryDate.toISOString(),
      qty: b.quantityOnHand,
    })),
  };
}

async function toolSearchDrugs(
  organizationId: string,
  raw: unknown,
) {
  const { query, limit } = searchDrugsArgs.parse(raw);
  const take = limit ?? 15;
  const term = query.trim();
  const drugs = await prisma.drug.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      OR: [
        { genericName: { contains: term, mode: "insensitive" } },
        { internalCode: { contains: term, mode: "insensitive" } },
        { barcode: { contains: term } },
        { brandName: { contains: term, mode: "insensitive" } },
      ],
    },
    take,
    orderBy: { genericName: "asc" },
    include: {
      batches: { where: { deletedAt: null }, select: { quantityOnHand: true } },
    },
  });

  return {
    results: drugs.map((d) => ({
      id: d.id,
      generic_name: d.genericName,
      brand_name: d.brandName,
      internal_code: d.internalCode,
      barcode: d.barcode,
      price_cash: d.priceCash.toString(),
      total_qty: d.batches.reduce((s, b) => s + b.quantityOnHand, 0),
    })),
  };
}

async function toolStockAlerts(organizationId: string, raw: unknown) {
  const parsed = stockAlertsArgs.parse(raw ?? {});
  const days = parsed.expiry_within_days ?? 90;
  const maxRows = parsed.max_rows ?? 20;
  const from = startOfDay(new Date());
  const cutoff = addDays(from, days);

  const batches = await prisma.drugBatch.findMany({
    where: {
      organizationId,
      deletedAt: null,
      expiryDate: { gte: from, lte: cutoff },
      quantityOnHand: { gt: 0 },
    },
    include: {
      drug: { select: { genericName: true, reorderLevel: true } },
    },
    orderBy: { expiryDate: "asc" },
    take: maxRows,
  });

  const allForLow = await prisma.drugBatch.findMany({
    where: { organizationId, deletedAt: null },
    include: {
      drug: { select: { genericName: true, reorderLevel: true } },
    },
  });

  const lowStock = allForLow
    .filter((b) => {
      const min = b.drug.reorderLevel;
      if (min == null) return false;
      return b.quantityOnHand <= min;
    })
    .slice(0, maxRows)
    .map((b) => ({
      drug: b.drug.genericName,
      batch: b.batchNumber,
      qty: b.quantityOnHand,
      reorder_level: b.drug.reorderLevel,
    }));

  return {
    expiry_within_days: days,
    expiring_batches: batches.map((b) => ({
      drug: b.drug.genericName,
      batch: b.batchNumber,
      expiry: b.expiryDate.toISOString(),
      qty: b.quantityOnHand,
    })),
    low_stock_batches: lowStock,
  };
}

async function toolTopSellersToday(organizationId: string, raw: unknown) {
  const { limit } = topSellersArgs.parse(raw ?? {});
  const take = limit ?? 10;
  const today = startOfDay(new Date());

  const grouped = await prisma.saleLine.groupBy({
    by: ["drugId"],
    where: {
      sale: {
        organizationId,
        status: "COMPLETED",
        createdAt: { gte: today },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take,
  });

  const drugIds = grouped.map((g) => g.drugId);
  const drugs = await prisma.drug.findMany({
    where: { id: { in: drugIds }, organizationId },
    select: { id: true, genericName: true },
  });
  const map = Object.fromEntries(drugs.map((d) => [d.id, d.genericName]));

  return {
    top_sellers: grouped.map((g) => ({
      drug: map[g.drugId] ?? g.drugId,
      quantity: g._sum.quantity ?? 0,
    })),
  };
}

async function toolAnalytics30(organizationId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sales, topLines] = await Promise.all([
    prisma.sale.findMany({
      where: {
        organizationId,
        status: "COMPLETED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { total: true },
    }),
    prisma.saleLine.groupBy({
      by: ["drugId"],
      where: {
        sale: {
          organizationId,
          status: "COMPLETED",
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
  ]);

  const drugIds = topLines.map((t) => t.drugId);
  const drugRows = await prisma.drug.findMany({
    where: { id: { in: drugIds }, organizationId },
    select: { id: true, genericName: true },
  });
  const drugMap = Object.fromEntries(drugRows.map((d) => [d.id, d.genericName]));

  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total), 0);

  return {
    period_days: 30,
    transaction_count: sales.length,
    total_revenue: totalRevenue,
    top_products: topLines.map((t) => ({
      name: drugMap[t.drugId] ?? t.drugId,
      quantity: t._sum.quantity ?? 0,
    })),
  };
}

async function toolCompareWeeks(organizationId: string) {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);

  const [thisWeekSum, thisWeekCount, lastWeekSum, lastWeekCount] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: { gte: thisWeekStart, lte: now },
        },
        _sum: { total: true },
      }),
      prisma.sale.count({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: { gte: thisWeekStart, lte: now },
        },
      }),
      prisma.sale.aggregate({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: { gte: lastWeekStart, lt: thisWeekStart },
        },
        _sum: { total: true },
      }),
      prisma.sale.count({
        where: {
          organizationId,
          status: "COMPLETED",
          createdAt: { gte: lastWeekStart, lt: thisWeekStart },
        },
      }),
    ]);

  return {
    this_week: {
      start: thisWeekStart.toISOString(),
      revenue: thisWeekSum._sum.total?.toString() ?? "0",
      sale_count: thisWeekCount,
    },
    last_week: {
      start: lastWeekStart.toISOString(),
      end_exclusive: thisWeekStart.toISOString(),
      revenue: lastWeekSum._sum.total?.toString() ?? "0",
      sale_count: lastWeekCount,
    },
  };
}

export async function executePharmacyTool(
  name: string,
  rawArgs: unknown,
  ctx: ToolContext,
): Promise<{ result: unknown; error?: string }> {
  try {
    switch (name) {
      case "get_pharmacy_snapshot":
        return { result: await toolGetPharmacySnapshot(ctx.organizationId) };
      case "search_drugs":
        return { result: await toolSearchDrugs(ctx.organizationId, rawArgs) };
      case "get_stock_alerts":
        return { result: await toolStockAlerts(ctx.organizationId, rawArgs) };
      case "top_sellers_today":
        return { result: await toolTopSellersToday(ctx.organizationId, rawArgs) };
      case "analytics_last_30_days":
        if (ctx.role !== "ADMIN") {
          return {
            result: null,
            error: "This report is only available to administrators.",
          };
        }
        return { result: await toolAnalytics30(ctx.organizationId) };
      case "compare_sales_weeks":
        if (ctx.role !== "ADMIN") {
          return {
            result: null,
            error: "This report is only available to administrators.",
          };
        }
        return { result: await toolCompareWeeks(ctx.organizationId) };
      default:
        return { result: null, error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return {
      result: null,
      error: e instanceof Error ? e.message : "Tool execution failed",
    };
  }
}
