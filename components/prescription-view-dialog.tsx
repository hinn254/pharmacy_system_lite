"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export type PrescriptionViewData = {
  id: string;
  rxNumber: string | null;
  prescriberName: string | null;
  issuedAt: Date | null;
  refillDueAt: Date | null;
  notes: string | null;
  items: {
    id: string;
    quantity: number;
    instructions: string | null;
    drug: { genericName: string; internalCode: string };
  }[];
};

export function PrescriptionViewDialog({
  prescription,
  children,
}: {
  prescription: PrescriptionViewData;
  children: React.ReactNode;
}) {
  const title = prescription.rxNumber?.trim() || "Prescription";

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {prescription.prescriberName ? (
            <div>
              <span className="text-muted-foreground">Prescriber · </span>
              {prescription.prescriberName}
            </div>
          ) : null}
          <div className="grid gap-1 sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Issued · </span>
              {prescription.issuedAt
                ? new Date(prescription.issuedAt).toLocaleDateString()
                : "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Refill due · </span>
              {prescription.refillDueAt
                ? new Date(prescription.refillDueAt).toLocaleDateString()
                : "—"}
            </div>
          </div>
          {prescription.notes ? (
            <div>
              <span className="text-muted-foreground">Notes · </span>
              {prescription.notes}
            </div>
          ) : null}
          <div className="border-t pt-3">
            <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              Line items
            </div>
            <ul className="space-y-2">
              {prescription.items.map((it) => (
                <li key={it.id}>
                  <div className="font-medium">{it.drug.genericName}</div>
                  <div className="text-muted-foreground text-xs font-mono">
                    {it.drug.internalCode} · Qty {it.quantity}
                    {it.instructions?.trim()
                      ? ` · ${it.instructions.trim()}`
                      : ""}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
