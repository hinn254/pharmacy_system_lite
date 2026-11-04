import { listPatients } from "@/lib/actions/patients";
import { PatientDialog } from "@/components/patient-dialog";
import { PatientsList } from "@/components/patients/patients-list";
import type { SerializedPatient } from "@/components/patients/types";
import { Button } from "@/components/ui/button";

function serializePatients(
  patients: Awaited<ReturnType<typeof listPatients>>,
): SerializedPatient[] {
  return patients.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    phone: p.phone,
    email: p.email,
    dob: p.dob?.toISOString() ?? null,
    notes: p.notes,
    marketingConsent: p.marketingConsent,
    prescriptions: p.prescriptions.map((rx) => ({
      id: rx.id,
      rxNumber: rx.rxNumber,
      prescriberName: rx.prescriberName,
      issuedAt: rx.issuedAt?.toISOString() ?? null,
      refillDueAt: rx.refillDueAt?.toISOString() ?? null,
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
    })),
  }));
}

export default async function PatientsPage() {
  const patients = await listPatients();

  const rows = serializePatients(patients);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="text-muted-foreground text-sm">
            CRM, prescriptions, refill dates for reminders
          </p>
        </div>
        <PatientDialog>
          <Button>Add patient</Button>
        </PatientDialog>
      </div>

      <PatientsList patients={rows} />
    </div>
  );
}
