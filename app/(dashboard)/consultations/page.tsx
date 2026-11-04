import Link from "next/link";
import { ConsultationIntake } from "@/components/consultations/consultation-intake";
import { queryConsultationCases } from "@/lib/consultation-case-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireSession } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage() {
  const session = await requireSession();
  const role = session.user.role;

  const cases = await queryConsultationCases({
    organizationId: session.user.organizationId,
    viewerUserId: session.user.id,
    viewerRole: role,
    ...(role === "CASHIER" ? { status: "READY_FOR_CASHIER" as const } : {}),
    ...(role === "DOCTOR" ? { assignedDoctorOnly: true as const } : {}),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold tracking-tight">Consultations</div>
          <div className="text-sm text-muted-foreground">
            {role === "CASHIER"
              ? "Cases ready for checkout"
              : role === "DOCTOR"
                ? "Your assigned cases"
                : role === "PHARM_TECH" || role === "ADMIN"
                  ? "Intake → Doctor → Pharm tech → Cashier"
                  : "Consultation cases"}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      </div>

      {role === "ADMIN" || role === "PHARM_TECH" ? <ConsultationIntake /> : null}

      <div className="rounded-xl border bg-card/50 shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-semibold">Recent cases</div>
          <div className="text-xs text-muted-foreground">
            Showing the latest {Math.min(cases.length, 200)} cases
          </div>
        </div>
        <div className="divide-y">
          {cases.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No cases yet.</div>
          ) : (
            cases.map((c) => (
              <Link
                key={c.id}
                href={`/consultations/${c.id}`}
                className="block px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {c.patient.fullName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.assignedDoctor
                        ? `Doctor: ${c.assignedDoctor.name ?? c.assignedDoctor.email}`
                        : "Doctor: Unassigned"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === "READY_FOR_PHARMTECH" && c.checkout?.cashierSaleId ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 text-xs font-semibold tracking-wide"
                      >
                        paid
                      </Badge>
                    ) : null}
                    <StatusBadge status={c.status} />
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {new Date(c.updatedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
