import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { redirectToLoginClearingSession } from "@/lib/auth-redirect";
import { getNavBadgeCounts } from "@/lib/nav-badge-counts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirectToLoginClearingSession();

  const orgId = session.user.organizationId;
  const [navBadgeCounts, org] = await Promise.all([
    getNavBadgeCounts(),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        settings: {
          select: { businessName: true, businessTagline: true, logoUrl: true },
        },
      },
    }),
  ]);

  return (
    <DashboardShell
      role={session.user.role}
      userName={session.user.name}
      userEmail={session.user.email ?? ""}
      navBadgeCounts={navBadgeCounts}
      orgBranding={{
        name: org?.settings?.businessName?.trim() || org?.name || "Pharmacy OS",
        tagline: org?.settings?.businessTagline?.trim() || "Clinical operations",
        logoUrl: org?.settings?.logoUrl ?? null,
      }}
    >
      {children}
    </DashboardShell>
  );
}
