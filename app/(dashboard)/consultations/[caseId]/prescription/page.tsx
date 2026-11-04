import { requireRoles } from "@/lib/authz";
import { getConsultationCaseById } from "@/lib/actions/consultations";
import { formatStatusLabel } from "@/components/ui/status-badge";
import { ConsultationPrescriptionDocument } from "@/components/consultations/consultation-prescription-document";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/print-button";
import { ArrowLeft } from "lucide-react";

export default async function ConsultationPrescriptionPrintPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  await requireRoles("PHARM_TECH", "ADMIN", "CASHIER");
  const { caseId } = await params;

  const cs = await getConsultationCaseById(caseId);
  if (!cs) notFound();

  const prescriberName =
    cs.assignedDoctor?.name?.trim() ||
    cs.assignedDoctor?.email?.trim() ||
    "Not assigned";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-1 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href={`/consultations/${caseId}`}>
            <ArrowLeft className="size-4" />
            Back to case
          </Link>
        </Button>
        <PrintButton label="Print prescription" />
      </div>
      <ConsultationPrescriptionDocument
        organizationName={cs.organization.name}
        patientName={cs.patient.fullName}
        patientPhone={cs.patient.phone}
        patientEmail={cs.patient.email}
        prescriberName={prescriberName}
        caseId={cs.id}
        caseStatusLabel={formatStatusLabel(cs.status)}
        documentDate={cs.updatedAt}
        lines={cs.medicationOrders}
        showStaffStatus={false}
      />
    </div>
  );
}
