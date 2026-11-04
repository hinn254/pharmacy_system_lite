"use client";

import { useMemo, useState, useTransition } from "react";
import type { DrugForPos } from "@/lib/actions/drugs";
import { PosDrugSearch } from "@/components/pos-drug-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addMedicationOrder } from "@/lib/actions/consultations";
import { toast } from "sonner";

export function DoctorOrderEntry({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<DrugForPos | null>(null);
  const [mode, setMode] = useState<"IN_SYSTEM" | "EXTERNAL">("IN_SYSTEM");
  const [externalName, setExternalName] = useState("");
  const [fulfillOutside, setFulfillOutside] = useState(false);
  const [qty, setQty] = useState("1");
  const [instructions, setInstructions] = useState("");

  const canAdd = useMemo(() => {
    const q = Number(qty);
    const hasName =
      mode === "IN_SYSTEM" ? Boolean(picked?.id) : Boolean(externalName.trim());
    return hasName && Number.isFinite(q) && q > 0;
  }, [picked, qty, mode, externalName]);

  function reset() {
    setPicked(null);
    setExternalName("");
    setFulfillOutside(false);
    setQty("1");
    setInstructions("");
  }

  return (
    <div className="rounded-xl border bg-card/50 p-4 shadow-sm space-y-3">
      <div className="text-sm font-semibold">Prescribe medication</div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "IN_SYSTEM" ? "default" : "outline"}
          disabled={pending}
          onClick={() => {
            setMode("IN_SYSTEM");
            setPicked(null);
          }}
        >
          In system
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "EXTERNAL" ? "default" : "outline"}
          disabled={pending}
          onClick={() => {
            setMode("EXTERNAL");
            setPicked(null);
          }}
        >
          External (buy outside)
        </Button>
      </div>

      {picked ? (
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
          <div className="font-medium">{picked.genericName}</div>
          <div className="text-xs text-muted-foreground">{picked.internalCode}</div>
        </div>
      ) : mode === "IN_SYSTEM" ? (
        <PosDrugSearch
          onAdd={(d) => {
            setPicked(d);
          }}
        />
      ) : (
        <Input
          value={externalName}
          onChange={(e) => setExternalName(e.target.value)}
          disabled={pending}
          placeholder="Medication name (e.g. Augmentin 625mg tabs)"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
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
            className="min-h-10"
          />
        </div>
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

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!canAdd || pending}
          onClick={() => {
            if (mode === "IN_SYSTEM" && !picked) return;
            startTransition(() => {
              void (async () => {
                try {
                  await addMedicationOrder({
                    caseId,
                    drugId: mode === "IN_SYSTEM" ? picked!.id : null,
                    externalDrugName: mode === "EXTERNAL" ? externalName : null,
                    quantity: Number(qty),
                    instructions,
                    fulfillOutside,
                  });
                  toast.success("Medication added");
                  reset();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              })();
            });
          }}
        >
          {pending ? "Adding…" : "Add medication"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => reset()}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

