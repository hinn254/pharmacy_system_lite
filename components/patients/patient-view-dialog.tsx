"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PatientDialog } from "@/components/patient-dialog";
import { PrescriptionDialog } from "@/components/prescription-dialog";
import { PrescriptionViewDialog } from "@/components/prescription-view-dialog";
import type { DrugSelectOption, SerializedPatient } from "./types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function PatientViewDialog({
  patient,
  drugs,
  children,
}: {
  patient: SerializedPatient;
  drugs: DrugSelectOption[];
  children: React.ReactNode;
}) {
  const patientForEdit = {
    id: patient.id,
    fullName: patient.fullName,
    phone: patient.phone,
    email: patient.email,
    dob: patient.dob ? new Date(patient.dob) : null,
    notes: patient.notes,
    marketingConsent: patient.marketingConsent,
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-left">{patient.fullName}</DialogTitle>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Phone
              </dt>
              <dd>{patient.phone?.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Email
              </dt>
              <dd className="break-all">{patient.email?.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Date of birth
              </dt>
              <dd>{formatDate(patient.dob)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Marketing consent
              </dt>
              <dd>{patient.marketingConsent ? "Yes" : "No"}</dd>
            </div>
          </dl>
          {patient.notes?.trim() ? (
            <div>
              <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                Notes
              </div>
              <p className="text-foreground whitespace-pre-wrap">{patient.notes}</p>
            </div>
          ) : null}

          <div className="border-t pt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Prescriptions ({patient.prescriptions.length})
            </div>
            {patient.prescriptions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No prescriptions on file.</p>
            ) : (
              <ul className="space-y-2">
                {patient.prescriptions.map((rx) => (
                  <li
                    key={rx.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <span>
                      {rx.rxNumber?.trim() || "Rx"} — refill {formatDate(rx.refillDueAt)}
                    </span>
                    <PrescriptionViewDialog
                      prescription={{
                        id: rx.id,
                        rxNumber: rx.rxNumber,
                        prescriberName: rx.prescriberName,
                        issuedAt: rx.issuedAt ? new Date(rx.issuedAt) : null,
                        refillDueAt: rx.refillDueAt ? new Date(rx.refillDueAt) : null,
                        notes: rx.notes,
                        items: rx.items.map((it) => ({
                          id: it.id,
                          quantity: it.quantity,
                          instructions: it.instructions,
                          drug: {
                            genericName: it.drug.genericName,
                            internalCode: it.drug.internalCode,
                          },
                        })),
                      }}
                    >
                      <Button type="button" variant="outline" size="sm">
                        Rx details
                      </Button>
                    </PrescriptionViewDialog>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 border-t bg-muted/20 px-6 py-4">
          <PatientDialog patient={patientForEdit}>
            <Button type="button" variant="outline" size="sm">
              Edit patient
            </Button>
          </PatientDialog>
          {drugs.length > 0 ? (
            <PrescriptionDialog
              patientId={patient.id}
              drugs={drugs.map((d) => ({ id: d.id, genericName: d.genericName }))}
            >
              <Button type="button" variant="secondary" size="sm">
                Add prescription
              </Button>
            </PrescriptionDialog>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
