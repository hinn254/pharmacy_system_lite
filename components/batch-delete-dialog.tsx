"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { softDeleteBatch } from "@/lib/actions/batches";
import { batchDeleteSchema } from "@/lib/validations/batch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BatchDeleteDialog({
  batch,
  children,
}: {
  batch: { id: string; drugName: string; batchNumber: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onConfirm() {
    const parsed = batchDeleteSchema.safeParse({ reason });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Reason is required");
      return;
    }

    setSubmitting(true);
    try {
      await softDeleteBatch(batch.id, parsed.data);
      toast.success("Batch deleted (soft)");
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete batch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete batch</DialogTitle>
          <DialogDescription>
            This removes the batch from POS immediately and keeps an audit trail. It may be purged
            after 30 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">
            <div className="font-medium">{batch.drugName}</div>
            <div className="text-muted-foreground font-mono text-xs">
              Batch {batch.batchNumber}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={reasonId}>Reason</Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you deleting this batch?"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={submitting}
          >
            {submitting ? "Deleting…" : "Delete batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

