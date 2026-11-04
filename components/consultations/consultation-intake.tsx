"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PosPatientSearch } from "@/components/pos-patient-search";
import { Button } from "@/components/ui/button";
import { createConsultationCase, listActiveDoctors } from "@/lib/actions/consultations";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type DoctorOption = Awaited<ReturnType<typeof listActiveDoctors>>[number];

export function ConsultationIntake() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const canCreate = useMemo(
    () => Boolean(patientId) && Boolean(doctorId),
    [patientId, doctorId],
  );

  const missingText = useMemo(() => {
    if (patientId && doctorId) return null;
    if (!patientId && !doctorId) return "Select a patient and a doctor to continue.";
    if (!patientId) return "Select a patient to continue.";
    return "Select a doctor to continue.";
  }, [patientId, doctorId]);

  async function loadDoctorsOnce() {
    if (doctors.length > 0 || loadingDoctors) return;
    setLoadingDoctors(true);
    try {
      const d = await listActiveDoctors();
      setDoctors(d);
    } finally {
      setLoadingDoctors(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold leading-tight">Start a consultation</div>
        <div className="text-sm text-muted-foreground">
          Choose a patient and a doctor, then create the case.
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">
          Step 1: Patient <span className="text-destructive">*</span>
        </Label>
        <PosPatientSearch
          selectedId={patientId}
          selectedLabel={patientLabel}
          onSelect={(id, label) => {
            setPatientId(id);
            setPatientLabel(label);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">
          Step 2: Doctor <span className="text-destructive">*</span>
        </Label>
        <Select
          value={doctorId ?? ""}
          onValueChange={(v) => setDoctorId(v || null)}
          onOpenChange={(open) => {
            if (open) void loadDoctorsOnce();
          }}
          disabled={pending}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder={loadingDoctors ? "Loading doctors…" : "Select a doctor"} />
          </SelectTrigger>
          <SelectContent>
            {doctors.length === 0 && !loadingDoctors ? (
              <SelectItem value="__NO_DOCTORS__" disabled>
                No doctors found
              </SelectItem>
            ) : null}
            {doctors.map((d) => (
              <SelectItem key={d.userId} value={d.userId}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {missingText ? (
          <div className="text-xs text-muted-foreground">{missingText}</div>
        ) : null}
      </div>

      <div className="flex items-center justify-end">
        <Button
          disabled={!canCreate || pending}
          onClick={() => {
            if (!patientId || !doctorId) return;
            startTransition(() => {
              void (async () => {
                try {
                  const created = await createConsultationCase({
                    patientId,
                    assignedDoctorId: doctorId,
                  });
                  toast.success("Consultation created");
                  router.refresh();
                  router.push(`/consultations/${created.id}`);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                }
              })();
            });
          }}
        >
          {pending ? "Creating…" : "Create case"}
        </Button>
      </div>
    </div>
  );
}

