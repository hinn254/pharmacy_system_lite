"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  assignConsultationDoctor,
  listActiveDoctors,
} from "@/lib/actions/consultations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DoctorOption = Awaited<ReturnType<typeof listActiveDoctors>>[number];

export function ConsultationDoctorAssigner({
  caseId,
  currentDoctorId,
  disabled,
}: {
  caseId: string;
  currentDoctorId: string | null | undefined;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState<string>(currentDoctorId ?? "");

  const canSave = useMemo(() => Boolean(doctorId.trim()), [doctorId]);

  const loadDoctors = useCallback(async () => {
    if (doctors.length > 0 || loading) return;
    setLoading(true);
    try {
      const d = await listActiveDoctors();
      setDoctors(d);
    } finally {
      setLoading(false);
    }
  }, [doctors.length, loading]);

  useEffect(() => {
    setDoctorId(currentDoctorId ?? "");
    if (currentDoctorId && !doctors.length && !loading) {
      void loadDoctors();
    }
  }, [currentDoctorId, doctors.length, loadDoctors, loading]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Assign / reassign doctor</div>
        <Select
          value={doctorId}
          onValueChange={setDoctorId}
          onOpenChange={(open) => {
            if (open) void loadDoctors();
          }}
          disabled={pending || disabled}
        >
          <SelectTrigger className="h-9 w-full sm:w-[260px]">
            <SelectValue placeholder={loading ? "Loading…" : "Select a doctor"} />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.userId} value={d.userId}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        size="sm"
        disabled={!canSave || pending || disabled}
        onClick={() => {
          startTransition(() => {
            void (async () => {
              try {
                await assignConsultationDoctor({ caseId, doctorUserId: doctorId });
                toast.success("Doctor assigned");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed");
              }
            })();
          });
        }}
      >
        {pending ? "Saving…" : "Assign doctor"}
      </Button>
    </div>
  );
}

