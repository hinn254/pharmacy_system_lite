"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { doctorMarkCaseReadyForCashier } from "@/lib/actions/consultations";
import { toast } from "sonner";

export function DoctorCaseActions({ caseId, status }: { caseId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  const disabled =
    pending ||
    status === "READY_FOR_PHARMTECH" ||
    status === "READY_FOR_CASHIER" ||
    status === "CLOSED" ||
    status === "CANCELLED";

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        onClick={() => {
          startTransition(() => {
            void (async () => {
              try {
                await doctorMarkCaseReadyForCashier(caseId);
                toast.success("Case sent to pharmacy");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            })();
          });
        }}
      >
        {pending ? "Sending…" : "Send to pharmacy"}
      </Button>
    </div>
  );
}

