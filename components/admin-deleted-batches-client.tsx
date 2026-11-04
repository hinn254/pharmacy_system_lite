"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { purgeSoftDeletedBatches, restoreDeletedBatch } from "@/lib/actions/batches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type DeletedBatchRow = {
  id: string;
  batchNumber: string;
  quantityOnHand: number;
  expiryDate: string;
  receivedAt: string;
  deletedAt: string;
  deletedReason: string | null;
  drug: { genericName: string; internalCode: string };
  deletedBy: { name: string | null; email: string } | null;
  referencedBySales: boolean;
};

export function AdminDeletedBatchesClient({
  rows,
  defaultPurgeDays = 30,
}: {
  rows: DeletedBatchRow[];
  defaultPurgeDays?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.drug.genericName,
        r.drug.internalCode,
        r.batchNumber,
        r.deletedReason ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows]);

  async function onRestore(id: string) {
    setBusyId(id);
    try {
      await restoreDeletedBatch(id);
      toast.success("Batch restored");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore");
    } finally {
      setBusyId(null);
    }
  }

  async function onPurgeNow() {
    setPurging(true);
    try {
      const res = await purgeSoftDeletedBatches(defaultPurgeDays);
      toast.success(`Purged ${res.deleted} batch${res.deleted === 1 ? "" : "es"}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to purge");
    } finally {
      setPurging(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            Soft-deleted batches are excluded from POS immediately. Purge permanently after {defaultPurgeDays} days.
          </div>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drug, code, batch, reason…"
              className="max-w-md"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.refresh()}>
            Refresh
          </Button>
          <Button variant="destructive" onClick={() => void onPurgeNow()} disabled={purging}>
            {purging ? "Purging…" : "Purge now"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Deleted</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No deleted batches.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const deletedBy = r.deletedBy?.name ?? r.deletedBy?.email ?? "—";
                const busy = busyId === r.id;
                return (
                  <TableRow key={r.id} className="border-border/40">
                    <TableCell>
                      <div className="font-medium">{r.drug.genericName}</div>
                      <div className="text-muted-foreground font-mono text-xs">{r.drug.internalCode}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{r.batchNumber}</TableCell>
                    <TableCell className="text-sm">
                      <div className="tabular-nums">{new Date(r.deletedAt).toLocaleString()}</div>
                      <div className="text-muted-foreground text-xs">By {deletedBy}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.deletedReason ?? "—"}</TableCell>
                    <TableCell>
                      {r.referencedBySales ? (
                        <Badge variant="secondary">Has sales</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not sold
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void onRestore(r.id)}
                        disabled={busy}
                      >
                        {busy ? "Restoring…" : "Restore"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

