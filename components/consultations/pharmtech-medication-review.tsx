"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { ConsultationMedicationOrderStatus } from "@prisma/client";
import { MedicationOrderEditor } from "@/components/consultations/medication-order-editor";
import { pharmTechUpdateMedicationOrder } from "@/lib/actions/consultations";

type OrderRow = {
  id: string;
  drugId: string | null;
  externalDrugName: string | null;
  fulfillOutside: boolean;
  quantity: number;
  instructions: string | null;
  status: ConsultationMedicationOrderStatus;
  drug: null | { id: string; genericName: string; internalCode: string };
  stockOnHand?: number | null;
};

export function PharmTechMedicationReview({
  orders,
  disabled,
}: {
  orders: OrderRow[];
  disabled?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingOrder = useMemo(() => {
    if (!editingId) return null;
    return orders.find((o) => o.id === editingId) ?? null;
  }, [editingId, orders]);

  return (
    <div className="rounded-xl border bg-card/50 p-4 shadow-sm space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">Pharmacy review</div>
        <div className="text-xs text-muted-foreground">
          Edit orders before sending to cashier.
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-sm text-muted-foreground">No medications yet.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div
              key={o.id}
              className={[
                "rounded-lg border p-3",
                !o.fulfillOutside &&
                o.drugId &&
                typeof o.stockOnHand === "number" &&
                o.stockOnHand < o.quantity
                  ? "border-destructive/50 bg-destructive/5"
                  : "bg-muted/10",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  {o.drugId
                    ? (o.drug?.genericName ?? "Unknown drug")
                    : o.externalDrugName ?? "External medication"}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  {o.fulfillOutside ? (
                    <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold tracking-wide">
                      outside
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={disabled}
                    onClick={() => setEditingId(o.id)}
                    aria-label="Edit medication order"
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {typeof o.stockOnHand === "number" && !o.fulfillOutside && o.drugId ? (
                  <>
                    Prescribed {o.quantity} · In stock {o.stockOnHand} ·{" "}
                  </>
                ) : (
                  <>Qty {o.quantity} ·{" "}</>
                )}
                {o.drugId
                  ? (o.drug?.internalCode ? `Code ${o.drug.internalCode}` : "No code")
                  : "No code"}
              </div>
              {o.instructions ? (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Instructions: </span>
                  {o.instructions}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {editingOrder ? (
        <MedicationOrderEditor
          open={Boolean(editingOrder)}
          onOpenChange={(v) => setEditingId(v ? editingOrder.id : null)}
          order={editingOrder}
          onSave={(payload) => pharmTechUpdateMedicationOrder(payload)}
        />
      ) : null}
    </div>
  );
}
