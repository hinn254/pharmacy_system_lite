import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not set" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) return unauthorized();

  const days = 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const candidates = await prisma.drugBatch.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
    take: 500,
  });

  const ids = candidates.map((c) => c.id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, skippedReferenced: 0 });
  }

  const referenced = await prisma.saleLineBatch.findMany({
    where: { batchId: { in: ids } },
    select: { batchId: true },
  });
  const referencedSet = new Set(referenced.map((r) => r.batchId));
  const deletableIds = ids.filter((id) => !referencedSet.has(id));

  if (deletableIds.length === 0) {
    return NextResponse.json({
      ok: true,
      deleted: 0,
      skippedReferenced: ids.length,
    });
  }

  const res = await prisma.drugBatch.deleteMany({
    where: { id: { in: deletableIds } },
  });

  return NextResponse.json({
    ok: true,
    deleted: res.count,
    skippedReferenced: ids.length - deletableIds.length,
  });
}

