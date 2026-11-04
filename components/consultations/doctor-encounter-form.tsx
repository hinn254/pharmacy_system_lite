"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { addConsultationEncounter } from "@/lib/actions/consultations";
import { toast } from "sonner";
import { useState } from "react";

export function DoctorEncounterForm({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition();
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [temperatureC, setTemperatureC] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");

  function isEmptyEncounter() {
    const hasVitals =
      Boolean(temperatureC.trim()) ||
      Boolean(weightKg.trim()) ||
      Boolean(bpSystolic.trim()) ||
      Boolean(bpDiastolic.trim());
    const hasText =
      Boolean(chiefComplaint.trim()) ||
      Boolean(assessment.trim()) ||
      Boolean(plan.trim()) ||
      Boolean(notes.trim());
    return !hasVitals && !hasText;
  }

  return (
    <div className="rounded-xl border bg-card/50 p-4 shadow-sm space-y-3">
      <div className="text-sm font-semibold">New encounter</div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Temperature (°C)</div>
          <Input value={temperatureC} onChange={(e) => setTemperatureC(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Weight (kg)</div>
          <Input value={weightKg} onChange={(e) => setWeightKg(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">BP systolic</div>
          <Input value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} disabled={pending} />
        </div>
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">BP diastolic</div>
          <Input value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} disabled={pending} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Chief complaint</div>
        <Textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Assessment</div>
        <Textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Plan</div>
        <Textarea value={plan} onChange={(e) => setPlan(e.target.value)} disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Notes</div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={pending} />
      </div>

      <Button
        disabled={pending}
        onClick={() => {
          if (isEmptyEncounter()) {
            toast.error("Encounter cannot be empty.");
            return;
          }
          startTransition(() => {
            void (async () => {
              try {
                await addConsultationEncounter({
                  caseId,
                  temperatureC: temperatureC.trim() ? Number(temperatureC) : null,
                  weightKg: weightKg.trim() ? Number(weightKg) : null,
                  bpSystolic: bpSystolic.trim() ? Number(bpSystolic) : null,
                  bpDiastolic: bpDiastolic.trim() ? Number(bpDiastolic) : null,
                  chiefComplaint,
                  assessment,
                  plan,
                  notes,
                });
                toast.success("Encounter saved");
                setChiefComplaint("");
                setAssessment("");
                setPlan("");
                setNotes("");
                setTemperatureC("");
                setWeightKg("");
                setBpSystolic("");
                setBpDiastolic("");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            })();
          });
        }}
      >
        {pending ? "Saving…" : "Save encounter"}
      </Button>
    </div>
  );
}

