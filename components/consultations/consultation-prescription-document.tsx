import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ConsultationMedicationOrderStatus } from "@prisma/client";

export type ConsultationPrescriptionLine = {
  id: string;
  drugId: string | null;
  externalDrugName: string | null;
  fulfillOutside: boolean;
  quantity: number;
  instructions: string | null;
  status: ConsultationMedicationOrderStatus;
  drug: null | {
    genericName: string;
    brandName: string | null;
    internalCode: string;
    dosageForm: string;
    strengthValue: string | null;
    strengthUnit: string | null;
    patientDirections: string;
  };
};

export type ConsultationPrescriptionDocumentProps = {
  organizationName: string;
  patientName: string;
  patientPhone: string | null;
  patientEmail: string | null;
  prescriberName: string;
  caseId: string;
  caseStatusLabel: string;
  documentDate: Date;
  lines: ConsultationPrescriptionLine[];
  /** When false, omit workflow status badges (patient-facing copy). */
  showStaffStatus: boolean;
};

function drugLabel(line: ConsultationPrescriptionLine) {
  if (line.drugId && line.drug) {
    const brand = line.drug.brandName?.trim();
    return brand ? `${line.drug.genericName} (${brand})` : line.drug.genericName;
  }
  return line.externalDrugName?.trim() || "Medication";
}

function formStrength(line: ConsultationPrescriptionLine) {
  if (!line.drug) return "";
  const strength =
    line.drug.strengthValue != null
      ? `${line.drug.strengthValue}${line.drug.strengthUnit ?? ""}`.trim()
      : "";
  return [line.drug.dosageForm, strength].filter(Boolean).join(" · ");
}

function directionsForLine(line: ConsultationPrescriptionLine) {
  const sig = line.instructions?.trim();
  if (sig) return sig;
  const def = line.drug?.patientDirections?.trim();
  return def || null;
}

export function ConsultationPrescriptionDocument({
  organizationName,
  patientName,
  patientPhone,
  patientEmail,
  prescriberName,
  caseId,
  caseStatusLabel,
  documentDate,
  lines,
  showStaffStatus,
}: ConsultationPrescriptionDocumentProps) {
  const activeLines = lines.filter((l) => l.status !== "CANCELLED");

  return (
    <div className="font-sans text-sm">
      <div className="border-border/80 bg-card/50 rounded-xl border p-6 shadow-sm print:border-0 print:bg-transparent print:p-0 print:shadow-none">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">{organizationName}</h1>
          <p className="text-muted-foreground mt-1 text-xs uppercase tracking-wide">
            Consultation prescription
          </p>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Patient
            </h2>
            <div className="text-sm font-medium">{patientName}</div>
            <div className="text-muted-foreground text-xs">
              {patientPhone?.trim() || patientEmail?.trim() ? (
                <>
                  {patientPhone?.trim() ? <span>{patientPhone}</span> : null}
                  {patientPhone?.trim() && patientEmail?.trim() ? <span> · </span> : null}
                  {patientEmail?.trim() ? <span>{patientEmail}</span> : null}
                </>
              ) : (
                "—"
              )}
            </div>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
              Prescriber
            </h2>
            <div className="text-sm font-medium">{prescriberName}</div>
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Prepared</span>
              <span>
                {documentDate.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            {showStaffStatus ? (
              <div className="flex justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Case status</span>
                <span>{caseStatusLabel}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-[11px] break-all">{caseId}</span>
            </div>
          </section>
        </div>

        <Separator className="my-5" />

        <section>
          <h2 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
            Medications
          </h2>
          {activeLines.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active medications on this consultation.</p>
          ) : (
            <ul className="space-y-4">
              {activeLines.map((line, idx) => {
                const directions = directionsForLine(line);
                const fs = formStrength(line);
                return (
                  <li
                    key={line.id}
                    className="rounded-lg border border-border/80 bg-muted/10 p-4 print:border-border print:bg-transparent"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-muted-foreground tabular-nums">
                          {idx + 1}.
                        </div>
                        <div className="mt-0.5 text-sm font-semibold leading-snug">{drugLabel(line)}</div>
                        {fs ? (
                          <div className="text-muted-foreground mt-1 text-xs">{fs}</div>
                        ) : null}
                        <div className="text-muted-foreground mt-1 text-xs font-mono">
                          {line.drug ? `Code ${line.drug.internalCode}` : "External / no formulary code"} · Qty{" "}
                          <span className="tabular-nums font-semibold text-foreground">{line.quantity}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {line.fulfillOutside ? (
                          <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                            Outside pharmacy
                          </Badge>
                        ) : null}
                        {showStaffStatus ? (
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                            {line.status.replaceAll("_", " ").toLowerCase()}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    {directions ? (
                      <p className="mt-3 border-t border-border/60 pt-3 text-sm leading-relaxed">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                          Directions ·{" "}
                        </span>
                        {directions}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
