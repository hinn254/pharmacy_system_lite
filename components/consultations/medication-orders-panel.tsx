"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { ConsultationMedicationOrderStatus } from "@prisma/client";
import { MedicationOrderEditor } from "@/components/consultations/medication-order-editor";
import { deleteMedicationOrder } from "@/lib/actions/consultations";
import { toast } from "sonner";

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

export function MedicationOrdersPanel({ orders }: { orders: OrderRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editingOrder = useMemo(() => {
    if (!editingId) return null;
    return orders.find((o) => o.id === editingId) ?? null;
  }, [editingId, orders]);

  return (
    <div className="rounded-xl border bg-card/50 p-4 shadow-sm space-y-2">
      <div className="text-sm font-semibold">Medication orders</div>
      {orders.length === 0 ? (
        <div className="text-sm text-muted-foreground">No medications yet.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="rounded-lg border bg-muted/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  {o.drugId ? (o.drug?.genericName ?? "Unknown drug") : o.externalDrugName ?? "External medication"}
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
                    onClick={() => setEditingId(o.id)}
                    aria-label="Edit medication order"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {o.status === "DRAFT" ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={pending}
                      aria-label="Remove medication order"
                      onClick={() => {
                        if (
                          !confirm(
                            "Remove this medication from the order list? This cannot be undone.",
                          )
                        )
                          return;
                        setPendingDeleteId(o.id);
                        startTransition(() => {
                          void (async () => {
                            try {
                              await deleteMedicationOrder({ orderId: o.id });
                              toast.success("Medication removed");
                              setEditingId((id) => (id === o.id ? null : id));
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed");
                            } finally {
                              setPendingDeleteId(null);
                            }
                          })();
                        });
                      }}
                    >
                      <Trash2
                        className={`size-4 ${pendingDeleteId === o.id ? "opacity-50" : ""}`}
                      />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Qty {o.quantity} ·{" "}
                {o.drugId ? (o.drug?.internalCode ? `Code ${o.drug.internalCode}` : "No code") : "No code"}
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
        />
      ) : null}
    </div>
  );
}
