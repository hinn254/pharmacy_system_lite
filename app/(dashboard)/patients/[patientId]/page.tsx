import Link from "next/link";
import { notFound } from "next/navigation";
import { getPatientDetails } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function computeAgeYears(dob: Date | null) {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return Math.max(0, age);
}

function isPdfUrl(url: string) {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().split("?")[0].endsWith(".pdf");
  }
}

export default async function PatientDetailsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const patient = await getPatientDetails(patientId);
  if (!patient) notFound();

  const ageYears = computeAgeYears(patient.dob);
  const consultations = patient.consultationCases;
  const prescriptions = patient.prescriptions;
  const documents = patient.posOrders;

  const allEncounters = consultations.flatMap((c) =>
    c.encounters.map((e) => ({ ...e, caseId: c.id, caseStatus: c.status })),
  );
  allEncounters.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{patient.fullName}</h1>
            <Badge variant={patient.marketingConsent ? "secondary" : "outline"}>
              Marketing: {patient.marketingConsent ? "Yes" : "No"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Patient profile, prescriptions, consultations, documents, and history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/patients">Back to patients</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Details</CardTitle>
          <CardDescription>Core patient information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <dd>
                {formatDate(patient.dob)}
                {ageYears != null ? (
                  <span className="text-muted-foreground"> · {ageYears}y</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Created
              </dt>
              <dd>{formatDate(patient.createdAt)}</dd>
            </div>
          </dl>

          {patient.notes?.trim() ? (
            <>
              <Separator />
              <div>
                <div className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                  Notes
                </div>
                <p className="whitespace-pre-wrap">{patient.notes}</p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="prescriptions">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="prescriptions">
            Prescriptions{" "}
            <span className="text-muted-foreground">({prescriptions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="consultations">
            Consultations{" "}
            <span className="text-muted-foreground">({consultations.length})</span>
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents <span className="text-muted-foreground">({documents.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            Medical history{" "}
            <span className="text-muted-foreground">({allEncounters.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="mt-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Prescriptions</CardTitle>
              <CardDescription>All prescriptions on file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {prescriptions.length === 0 ? (
                <p className="text-muted-foreground">No prescriptions on file.</p>
              ) : (
                <ul className="space-y-2">
                  {prescriptions.map((rx) => (
                    <li key={rx.id} className="rounded-md border bg-muted/20 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">
                            {rx.rxNumber?.trim() || "Rx"}{" "}
                            <span className="text-muted-foreground font-normal">
                              · issued {formatDate(rx.issuedAt)}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Prescriber: {rx.prescriberName?.trim() || "—"}
                          </div>
                        </div>
                        <div className="text-muted-foreground text-sm">
                          Refill due: {formatDate(rx.refillDueAt)}
                        </div>
                      </div>

                      {rx.items.length ? (
                        <ul className="mt-3 space-y-1 text-sm">
                          {rx.items.map((it) => (
                            <li key={it.id} className="flex flex-wrap gap-x-2">
                              <span className="font-medium">
                                {it.drug.genericName} ({it.drug.internalCode})
                              </span>
                              <span className="text-muted-foreground">
                                · qty {it.quantity}
                              </span>
                              {it.instructions?.trim() ? (
                                <span className="text-muted-foreground">
                                  · {it.instructions}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {rx.notes?.trim() ? (
                        <p className="text-muted-foreground mt-3 whitespace-pre-wrap text-sm">
                          {rx.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultations" className="mt-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Consultations</CardTitle>
              <CardDescription>Cases and summaries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {consultations.length === 0 ? (
                <p className="text-muted-foreground">No consultations on file.</p>
              ) : (
                <ul className="space-y-2">
                  {consultations.map((cs) => (
                    <li key={cs.id} className="rounded-md border bg-muted/20 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-medium">
                            Case{" "}
                            <span className="font-mono text-xs text-muted-foreground">
                              {cs.id.slice(0, 8)}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Created {formatDate(cs.createdAt)}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Assigned doctor:{" "}
                            {cs.assignedDoctor?.name ||
                              cs.assignedDoctor?.email ||
                              "—"}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={cs.status} />
                          <span className="text-muted-foreground text-sm">
                            Encounters: {cs.encounters.length} · Meds:{" "}
                            {cs.medicationOrders.length}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Documents</CardTitle>
              <CardDescription>Uploaded prescription documents (POS)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-muted-foreground">No documents on file.</p>
              ) : (
                <ul className="space-y-2">
                  {documents.map((d) => (
                    <li key={d.id} className="rounded-md border bg-muted/20 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-medium">Prescription document</div>
                          <div className="text-muted-foreground text-sm">
                            Uploaded {formatDate(d.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={d.status} />
                          {d.prescriptionPhotoUrl ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={d.prescriptionPhotoUrl} target="_blank" rel="noreferrer">
                                Open
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {d.prescriptionPhotoUrl && !isPdfUrl(d.prescriptionPhotoUrl) ? (
                        <div className="mt-3 overflow-hidden rounded-md border bg-background p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={d.prescriptionPhotoUrl}
                            alt="Prescription document"
                            className="max-h-72 w-full rounded object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Medical history</CardTitle>
              <CardDescription>Consultation encounters (vitals + clinical notes)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {allEncounters.length === 0 ? (
                <p className="text-muted-foreground">
                  No encounter notes on file yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {allEncounters.map((e) => (
                    <li key={e.id} className="rounded-md border bg-muted/20 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-medium">
                            Encounter · {formatDate(e.createdAt)}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            Case{" "}
                            <span className="font-mono text-xs">{e.caseId.slice(0, 8)}</span>{" "}
                            · By{" "}
                            {e.createdBy?.name || e.createdBy?.email || "—"}
                          </div>
                        </div>
                        <StatusBadge status={e.caseStatus} />
                      </div>

                      {(e.chiefComplaint?.trim() ||
                        e.assessment?.trim() ||
                        e.plan?.trim() ||
                        e.notes?.trim()) && (
                        <div className="mt-3 space-y-2 text-sm">
                          {e.chiefComplaint?.trim() ? (
                            <div>
                              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                Chief complaint
                              </div>
                              <p className="whitespace-pre-wrap">{e.chiefComplaint}</p>
                            </div>
                          ) : null}
                          {e.assessment?.trim() ? (
                            <div>
                              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                Assessment
                              </div>
                              <p className="whitespace-pre-wrap">{e.assessment}</p>
                            </div>
                          ) : null}
                          {e.plan?.trim() ? (
                            <div>
                              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                Plan
                              </div>
                              <p className="whitespace-pre-wrap">{e.plan}</p>
                            </div>
                          ) : null}
                          {e.notes?.trim() ? (
                            <div>
                              <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                                Notes
                              </div>
                              <p className="whitespace-pre-wrap">{e.notes}</p>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
