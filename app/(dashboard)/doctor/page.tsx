import Link from "next/link";
import { requireRoles } from "@/lib/authz";
import { queryConsultationCases } from "@/lib/consultation-case-queries";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage() {
  const session = await requireRoles("DOCTOR");
  const cases = await queryConsultationCases({
    organizationId: session.user.organizationId,
    viewerUserId: session.user.id,
    viewerRole: session.user.role,
    assignedDoctorOnly: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold tracking-tight">Doctor dashboard</div>
          <div className="text-sm text-muted-foreground">
            Your assigned consultation cases
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card/50 shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-semibold">Assigned cases</div>
          <div className="text-xs text-muted-foreground">
            {cases.length === 0
              ? "No assigned cases"
              : `Showing ${cases.length} case(s) · ${cases.filter((c) => c.status === "OPEN" || c.status === "ASSIGNED").length} not seen yet`}
          </div>
        </div>
        <div className="divide-y">
          {cases.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              When pharmacy staff assigns you a case, it will appear here.
            </div>
          ) : (
            cases.map((c) => (
              <Link
                key={c.id}
                href={`/consultations/${c.id}`}
                className="block px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.patient.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.patient.phone || c.patient.email || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
