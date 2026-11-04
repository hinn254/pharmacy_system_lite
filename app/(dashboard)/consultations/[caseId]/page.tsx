import { requireSession } from "@/lib/authz";
import { getConsultationCaseById } from "@/lib/actions/consultations";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatStatusLabel, StatusBadge } from "@/components/ui/status-badge";
import { ConsultationPrescriptionDocument } from "@/components/consultations/consultation-prescription-document";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DoctorEncounterForm } from "@/components/consultations/doctor-encounter-form";
import { DoctorOrderEntry } from "@/components/consultations/doctor-order-entry";
import { ConsultationSafetyCheck } from "@/components/consultations/consultation-safety-check";
import { MedicationOrdersPanel } from "@/components/consultations/medication-orders-panel";
import { DoctorCaseActions } from "@/components/consultations/doctor-case-actions";
import { PharmTechCaseActions } from "@/components/consultations/pharmtech-case-actions";
import { CashierCheckout } from "@/components/consultations/cashier-checkout";
import { listInsuranceSchemes } from "@/lib/actions/insurance-schemes";
import { ConsultationDoctorAssigner } from "@/components/consultations/consultation-doctor-assigner";
import { PharmTechMedicationReview } from "@/components/consultations/pharmtech-medication-review";

export default async function ConsultationCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const session = await requireSession();
  const { caseId } = await params;

  const cs = await getConsultationCaseById(caseId);
  if (!cs) notFound();

  const role = session.user.role;
  const insuranceSchemes =
    role === "CASHIER"
      ? await listInsuranceSchemes({ activeOnly: true })
      : [];

  const prescriberName =
    cs.assignedDoctor?.name?.trim() ||
    cs.assignedDoctor?.email?.trim() ||
    "Not assigned";

  const staffPrescriptionRoles = role === "PHARM_TECH" || role === "ADMIN" || role === "CASHIER";
  const cashierSaleId = cs.checkout?.cashierSaleId ?? null;
  const prescriptionLines =
    role === "CASHIER"
      ? cs.medicationOrders.filter((o) => o.status === "SENT_TO_CASHIER")
      : cs.medicationOrders;
  const pharmTechOrders =
    role === "PHARM_TECH" || role === "ADMIN"
      ? cs.medicationOrders.map((o) => ({
          ...o,
          stockOnHand:
            o.drugId && !o.fulfillOutside
              ? (cs.drugStockOnHandByDrugId?.[o.drugId] ?? 0)
              : null,
        }))
      : [];
  const hasLowStockMeds =
    role === "PHARM_TECH" || role === "ADMIN"
      ? pharmTechOrders.some(
          (o) =>
            !o.fulfillOutside &&
            Boolean(o.drugId) &&
            typeof o.stockOnHand === "number" &&
            o.stockOnHand < o.quantity,
        )
      : false;
  const caseDetailGridClass =
    role === "CASHIER"
      ? "space-y-4"
      : role === "ADMIN"
        ? "grid gap-4 lg:grid-cols-2"
        : "space-y-4";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 gap-1">
          <Link href="/consultations">
            <ArrowLeft className="size-4" />
            Back to consultations
          </Link>
        </Button>
        <StatusBadge status={cs.status} />
      </div>

      <div className="rounded-xl border bg-card/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold tracking-tight">
              {cs.patient.fullName}
            </div>
            <div className="text-sm text-muted-foreground">
              {cs.patient.phone || cs.patient.email || "—"}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-muted-foreground">
              Updated{" "}
              {new Date(cs.updatedAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
            {role === "DOCTOR" ? (
              <DoctorCaseActions caseId={cs.id} status={cs.status} />
            ) : role === "PHARM_TECH" || role === "ADMIN" ? (
              <PharmTechCaseActions
                caseId={cs.id}
                status={cs.status}
                cashierSaleId={cashierSaleId}
                hasLowStockMeds={hasLowStockMeds}
              />
            ) : null}
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Assigned doctor</div>
            <div className="text-sm font-medium">
              {cs.assignedDoctor?.name ?? cs.assignedDoctor?.email ?? "Unassigned"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Created by</div>
            <div className="text-sm">
              {cs.createdBy.name ?? cs.createdBy.email}
            </div>
          </div>
        </div>

        {role === "PHARM_TECH" || role === "ADMIN" ? (
          <>
            <Separator className="my-4" />
            <ConsultationDoctorAssigner
              caseId={cs.id}
              currentDoctorId={cs.assignedDoctor?.id ?? null}
              disabled={
                Boolean(cashierSaleId) ||
                cs.status === "CLOSED" ||
                cs.status === "CANCELLED"
              }
            />
          </>
        ) : null}
      </div>

      {role === "DOCTOR" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <DoctorEncounterForm caseId={cs.id} />
            <div className="rounded-xl border bg-card/50 p-4 shadow-sm space-y-2">
              <div className="text-sm font-semibold">Encounters</div>
              {cs.encounters.length === 0 ? (
                <div className="text-sm text-muted-foreground">No encounters yet.</div>
              ) : (
                <div className="space-y-3">
                  {cs.encounters.map((e) => (
                    <div key={e.id} className="rounded-lg border bg-muted/10 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">
                          {new Date(e.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.createdBy.name ?? e.createdBy.email}
                        </div>
                      </div>
                      {(e.chiefComplaint || e.assessment || e.plan || e.notes) && (
                        <div className="mt-2 space-y-1 text-sm">
                          {e.chiefComplaint ? (
                            <div>
                              <span className="text-muted-foreground">CC: </span>
                              {e.chiefComplaint}
                            </div>
                          ) : null}
                          {e.assessment ? (
                            <div>
                              <span className="text-muted-foreground">A: </span>
                              {e.assessment}
                            </div>
                          ) : null}
                          {e.plan ? (
                            <div>
                              <span className="text-muted-foreground">P: </span>
                              {e.plan}
                            </div>
                          ) : null}
                          {e.notes ? (
                            <div>
                              <span className="text-muted-foreground">Notes: </span>
                              {e.notes}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <DoctorOrderEntry caseId={cs.id} />
            <ConsultationSafetyCheck caseId={cs.id} />
            <MedicationOrdersPanel orders={cs.medicationOrders} />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {role === "PHARM_TECH" || role === "ADMIN" ? (
            cs.status === "READY_FOR_PHARMTECH" && !cashierSaleId ? (
              <PharmTechMedicationReview orders={pharmTechOrders} />
            ) : null
          ) : null}

          <div className="rounded-xl border bg-card/50 p-5 shadow-sm">
            <div className="text-sm font-semibold">Case details</div>
            {role === "CASHIER" && cs.status === "READY_FOR_CASHIER" ? (
              <div className="mt-4">
                <CashierCheckout
                  caseId={cs.id}
                  insuranceSchemes={insuranceSchemes.map((s) => ({
                    id: s.id,
                    name: s.name,
                    isActive: s.isActive,
                  }))}
                />
              </div>
            ) : null}
            <Separator className="my-4" />
            <div className={caseDetailGridClass}>
              <div className="space-y-3">
                {staffPrescriptionRoles ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold">Prescription</div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/consultations/${cs.id}/prescription`}>Print layout</Link>
                      </Button>
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
                      lines={prescriptionLines}
                      showStaffStatus={role !== "CASHIER"}
                    />
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold">Medication orders</div>
                    {cs.medicationOrders.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No medications yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {cs.medicationOrders.map((o) => (
                          <div key={o.id} className="rounded-lg border bg-muted/10 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium">
                                {o.drugId
                                  ? o.drug?.genericName
                                  : o.externalDrugName ?? "External medication"}
                              </div>
                              <Badge
                                variant="outline"
                                className="px-3 py-1 text-sm font-semibold tracking-wide"
                              >
                                {o.status.toLowerCase()}
                              </Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Qty {o.quantity} ·{" "}
                              {o.drugId ? `Code ${o.drug?.internalCode ?? "—"}` : "No code"}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              {role === "ADMIN" ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Encounters</div>
                  {cs.encounters.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No encounters yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {cs.encounters.map((e) => (
                        <div key={e.id} className="rounded-lg border bg-muted/10 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs text-muted-foreground">
                              {new Date(e.createdAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {e.createdBy.name ?? e.createdBy.email}
                            </div>
                          </div>
                          {e.chiefComplaint ? (
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">CC: </span>
                              {e.chiefComplaint}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
