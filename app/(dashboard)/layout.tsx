import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { redirectToLoginClearingSession } from "@/lib/auth-redirect";
import { getNavBadgeCounts } from "@/lib/nav-badge-counts";
import { prisma } from "@/lib/prisma";
import { ensureSubscription } from "@/lib/billing/service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirectToLoginClearingSession();

  const orgId = session.user.organizationId;
  const [navBadgeCounts, org, subscription] = await Promise.all([
    getNavBadgeCounts(),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        isDemo: true,
        settings: {
          select: { businessName: true, businessTagline: true, logoUrl: true },
        },
      },
    }),
    ensureSubscription(orgId),
  ]);

  if (!org) {
    redirectToLoginClearingSession();
  }

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
      billing={{ status: subscription.status, accessEndsAt: subscription.periodEndAt ?? subscription.trialEndsAt }}
      demo={org.isDemo}
    >
      {children}
    </DashboardShell>
  );
}
