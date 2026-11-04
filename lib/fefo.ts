import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Allocate quantity from batches ordered by expiry (FEFO). Throws if insufficient stock. */
export async function allocateFefo(
  db: Prisma.TransactionClient | typeof prisma,
  organizationId: string,
  drugId: string,
  quantity: number,
): Promise<{ batchId: string; quantity: number }[]> {
  if (quantity <= 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const batches = await db.drugBatch.findMany({
    where: {
      organizationId,
      drugId,
      quantityOnHand: { gt: 0 },
      deletedAt: null,
      expiryDate: { gte: today },
    },
    orderBy: { expiryDate: "asc" },
  });

  let remaining = quantity;
  const allocations: { batchId: string; quantity: number }[] = [];

  for (const b of batches) {
    if (remaining <= 0) break;
    const take = Math.min(b.quantityOnHand, remaining);
    if (take > 0) {
      allocations.push({ batchId: b.id, quantity: take });
      remaining -= take;
    }
  }

  if (remaining > 0) {
    throw new Error(
      `Insufficient stock for drug. Need ${quantity}, short by ${remaining}.`,
    );
  }

  return allocations;
}
