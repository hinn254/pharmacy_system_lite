"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateMedicationOrder } from "@/lib/actions/consultations";
import { toast } from "sonner";
import type { ConsultationMedicationOrderStatus } from "@prisma/client";

type OrderRow = {
  id: string;
  drugId: string | null;
  externalDrugName: string | null;
  fulfillOutside: boolean;
  quantity: number;
  instructions: string | null;
  status: ConsultationMedicationOrderStatus;
  drug: null | { id: string; genericName: string; internalCode: string };
};

export function MedicationOrderEditor({
  open,
  onOpenChange,
  order,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: OrderRow;
  onSave?: (input: {
    orderId: string;
    quantity: number;
    instructions: string;
    fulfillOutside: boolean;
    externalDrugName: string;
  }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [qty, setQty] = useState(String(order.quantity));
  const [instructions, setInstructions] = useState(order.instructions ?? "");
  const [externalDrugName, setExternalDrugName] = useState(
    order.externalDrugName ?? "",
  );
  const [fulfillOutside, setFulfillOutside] = useState(order.fulfillOutside);

  const canSave = useMemo(() => {
    const n = Number(qty);
    return Number.isFinite(n) && n > 0;
  }, [qty]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (pending) return;
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit medication order</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/10 px-3 py-2">
            <div className="text-sm font-medium">
              {order.drugId
                ? (order.drug?.genericName ?? "Unknown drug")
                : (order.externalDrugName ?? "External medication")}
            </div>
            <div className="text-xs text-muted-foreground">
              {order.drugId
                ? (order.drug?.internalCode ? `Code ${order.drug.internalCode}` : "No code")
                : "Outside purchase / free-text"}
            </div>
          </div>

          {!order.drugId ? (
            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">Medication name</div>
              <Input
                value={externalDrugName}
                onChange={(e) => setExternalDrugName(e.target.value)}
                disabled={pending}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">Quantity</div>
            <Input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="numeric"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">Instructions (optional)</div>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={pending}
              className="min-h-20"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary"
              checked={fulfillOutside}
              disabled={pending}
              onChange={(e) => setFulfillOutside(e.target.checked)}
            />
            Mark as “buy outside” (won’t be sold in-pharmacy)
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave || pending}
            onClick={() => {
              startTransition(() => {
                void (async () => {
                  try {
                    const save = onSave ?? (async (payload) => updateMedicationOrder(payload));
                    await save({
                      orderId: order.id,
                      quantity: Number(qty),
                      instructions,
                      fulfillOutside,
                      externalDrugName,
                    });
                    toast.success("Medication updated");
                    onOpenChange(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })();
              });
            }}
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

