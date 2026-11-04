"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { pharmTechMarkCaseDispensed, pharmTechSendCaseToCashier } from "@/lib/actions/consultations";
import { toast } from "sonner";

export function PharmTechCaseActions({
  caseId,
  status,
  cashierSaleId,
  hasLowStockMeds,
}: {
  caseId: string;
  status: string;
  cashierSaleId: string | null | undefined;
  hasLowStockMeds?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const canSendToCashier = status === "READY_FOR_PHARMTECH" && !cashierSaleId && !hasLowStockMeds;
  const canMarkDispensed = status === "READY_FOR_PHARMTECH" && Boolean(cashierSaleId);

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {!cashierSaleId ? (
        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            size="sm"
            disabled={pending || !canSendToCashier}
            onClick={() => {
              if (hasLowStockMeds) {
                toast.error("Fix low-stock medication quantities before sending to cashier.");
                return;
              }
              startTransition(() => {
                void (async () => {
                  try {
                    await pharmTechSendCaseToCashier(caseId);
                    toast.success("Case sent to cashier");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                })();
              });
            }}
          >
            {pending ? "Sending…" : "Send to cashier"}
          </Button>
          {hasLowStockMeds ? (
            <div className="text-xs text-destructive">
              Low stock: adjust quantities before sending.
            </div>
          ) : null}
        </div>
      ) : null}

      {cashierSaleId ? (
        <Button
          type="button"
          size="sm"
          disabled={pending || !canMarkDispensed}
          onClick={() => {
            startTransition(() => {
              void (async () => {
                try {
                  await pharmTechMarkCaseDispensed(caseId);
                  toast.success("Marked dispensed");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              })();
            });
          }}
        >
          {pending ? "Saving…" : "Mark dispensed"}
        </Button>
      ) : (
        <div className="text-xs font-semibold text-destructive self-center">
          Waiting for payment before dispensing.
        </div>
      )}
    </div>
  );
}

