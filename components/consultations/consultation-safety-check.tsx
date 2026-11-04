"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { analyzeConsultationOrders } from "@/lib/actions/consultations";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export function ConsultationSafetyCheck({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="rounded-xl border bg-card/50 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Medication safety (AI)</div>
          <div className="text-xs text-muted-foreground">
            Advisory-only warnings based on orders and latest vitals.
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(() => {
              void (async () => {
                try {
                  const r = await analyzeConsultationOrders(caseId);
                  setResult(r.message);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "AI check failed");
                }
              })();
            });
          }}
        >
          {pending ? "Running…" : "Run check"}
        </Button>
      </div>

      {result ? (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{result}</div>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="text-sm text-muted-foreground">
          Run the check after adding medications.
        </div>
      )}
    </div>
  );
}

