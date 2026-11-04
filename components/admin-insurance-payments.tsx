"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setInsurancePaymentSettled } from "@/lib/actions/sales";
import { toast } from "sonner";

type PaymentRow = {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
};

export function AdminInsurancePaymentsCell({
  payments,
  canSettleInsurance = false,
}: {
  payments: PaymentRow[];
  /** Only admins may settle insurance payments server-side. */
  canSettleInsurance?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const insurance = payments.filter((p) => p.method === PaymentMethod.INSURANCE);
  if (insurance.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <div className="flex max-w-[200px] flex-col gap-2">
      {insurance.map((p) => (
        <div
          key={p.id}
          className="flex flex-wrap items-center gap-1.5 border border-border/50 bg-muted/20 rounded-md px-2 py-1.5"
        >
          {p.status === PaymentStatus.PENDING ? (
            <Badge variant="secondary" className="text-[10px]">
              Initiated
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-700 dark:text-emerald-400">
              Paid
            </Badge>
          )}
          {p.status === PaymentStatus.PENDING && canSettleInsurance ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-7 text-[11px]"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await setInsurancePaymentSettled(p.id);
                    toast.success("Marked as paid");
                    router.refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to update");
                  }
                });
              }}
            >
              Mark paid
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
