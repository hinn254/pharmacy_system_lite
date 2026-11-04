import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listDeletedBatches } from "@/lib/actions/batches";
import { AdminDeletedBatchesClient, type DeletedBatchRow } from "@/components/admin-deleted-batches-client";
import { Button } from "@/components/ui/button";

export default async function AdminDeletedBatchesPage() {
  const rows = await listDeletedBatches(300);
  const ids = rows.map((r) => r.id);

  const referencedIds = ids.length
    ? await prisma.saleLineBatch.findMany({
        where: { batchId: { in: ids } },
        select: { batchId: true },
      })
    : [];
  const referencedSet = new Set(referencedIds.map((r) => r.batchId));

  const payload: DeletedBatchRow[] = rows.map((r) => ({
    id: r.id,
    batchNumber: r.batchNumber,
    quantityOnHand: r.quantityOnHand,
    expiryDate: r.expiryDate.toISOString(),
    receivedAt: r.receivedAt.toISOString(),
    deletedAt: r.deletedAt!.toISOString(),
    deletedReason: r.deletedReason ?? null,
    drug: { genericName: r.drug.genericName, internalCode: r.drug.internalCode },
    deletedBy: r.deletedBy ? { name: r.deletedBy.name ?? null, email: r.deletedBy.email } : null,
    referencedBySales: referencedSet.has(r.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deleted batches</h1>
          <p className="text-muted-foreground text-sm">
            Soft-deleted batches (excluded from POS). Restore or purge permanently.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory/batches">Back to batches</Link>
          </Button>
        </div>
      </div>

      <AdminDeletedBatchesClient rows={payload} defaultPurgeDays={30} />
    </div>
  );
}

