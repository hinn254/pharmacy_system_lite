"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.organizationId) return null;
  const orgId = session.user.organizationId;
  const today = startOfDay(new Date());
  const expiryCutoff = addDays(today, 90);

  const [salesToday, salesCount, lowStockBatches, expiringSoonCount, expiringBatches] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          organizationId: orgId,
          status: "COMPLETED",
          createdAt: { gte: today },
        },
        _sum: { total: true },
      }),
      prisma.sale.count({
        where: {
          organizationId: orgId,
          status: "COMPLETED",
          createdAt: { gte: today },
        },
      }),
      prisma.drugBatch.findMany({
        where: { organizationId: orgId, deletedAt: null },
        include: {
          drug: {
            select: {
              genericName: true,
              reorderLevel: true,
            },
          },
        },
      }),
      prisma.drugBatch.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          expiryDate: { gte: today, lte: expiryCutoff },
          quantityOnHand: { gt: 0 },
        },
      }),
      prisma.drugBatch.findMany({
        where: {
          organizationId: orgId,
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
    salesTodayTotal: salesToday._sum.total?.toString() ?? "0",
    salesTodayCount: salesCount,
    lowStockCount: lowStock.length,
    expiringSoonCount,
    expiringSoon: expiringBatches.map((b) => ({
      id: b.id,
      drugName: b.drug.genericName,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate.toISOString(),
      qty: b.quantityOnHand,
    })),
  };
}

const MOVEMENT_WINDOW_DAYS = 30;

export async function getProductMovementInsights() {
  const session = await auth();
  if (!session?.user?.organizationId) return null;
  const orgId = session.user.organizationId;
  const since = new Date(
    Date.now() - MOVEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const saleWhere = {
    organizationId: orgId,
    status: "COMPLETED" as const,
    createdAt: { gte: since },
  };

  const [fastLines, slowLines] = await Promise.all([
    prisma.saleLine.groupBy({
      by: ["drugId"],
      where: { sale: saleWhere },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.saleLine.groupBy({
      by: ["drugId"],
      where: { sale: saleWhere },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "asc" } },
      take: 5,
    }),
  ]);

  const ids = Array.from(
    new Set([
      ...fastLines.map((r) => r.drugId),
      ...slowLines.map((r) => r.drugId),
    ]),
  );
  if (ids.length === 0) {
    return {
      periodDays: MOVEMENT_WINDOW_DAYS,
      fastMovers: [] as { drugId: string; name: string; quantity: number }[],
      slowMovers: [] as { drugId: string; name: string; quantity: number }[],
    };
  }

  const drugs = await prisma.drug.findMany({
    where: { id: { in: ids }, organizationId: orgId },
    select: { id: true, genericName: true },
  });
  const drugMap = Object.fromEntries(drugs.map((d) => [d.id, d.genericName]));

  const mapRows = (
    rows: { drugId: string; _sum: { quantity: number | null } }[],
  ) =>
    rows.map((t) => ({
      drugId: t.drugId,
      name: drugMap[t.drugId] ?? t.drugId,
      quantity: t._sum.quantity ?? 0,
    }));

  return {
    periodDays: MOVEMENT_WINDOW_DAYS,
    fastMovers: mapRows(fastLines),
    slowMovers: mapRows(slowLines),
  };
}

export async function getAnalyticsSummary() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "ADMIN") {
    return null;
  }
  const orgId = session.user.organizationId;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sales, topLines] = await Promise.all([
    prisma.sale.findMany({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { total: true, createdAt: true },
    }),
    prisma.saleLine.groupBy({
      by: ["drugId"],
      where: {
        sale: {
          organizationId: orgId,
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
  const drugs = await prisma.drug.findMany({
    where: { id: { in: drugIds }, organizationId: orgId },
    select: { id: true, genericName: true },
  });
  const drugMap = Object.fromEntries(drugs.map((d) => [d.id, d.genericName]));

  const totalRevenue = sales.reduce(
    (acc, s) => acc + Number(s.total),
    0,
  );

  return {
    periodDays: 30,
    transactionCount: sales.length,
    totalRevenue,
    topProducts: topLines.map((t) => ({
      drugId: t.drugId,
      name: drugMap[t.drugId] ?? t.drugId,
      quantity: t._sum.quantity ?? 0,
    })),
  };
}
