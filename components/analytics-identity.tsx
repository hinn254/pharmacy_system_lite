"use client";

import { useEffect } from "react";
import type { UserRole } from "@prisma/client";
import { posthog } from "@/lib/analytics/client";

export function AnalyticsIdentity({
  userId,
  organizationId,
  role,
  plan,
  subscriptionStatus,
  isDemo,
}: {
  userId: string;
  organizationId: string;
  role: UserRole;
  plan?: string;
  subscriptionStatus?: string;
  isDemo: boolean;
}) {
  useEffect(() => {
    try {
      posthog.identify(userId, { role });
      posthog.group("organization", organizationId, {
        plan,
        subscription_status: subscriptionStatus,
        is_demo: isDemo,
      });
    } catch {
      // Identity enrichment is best-effort.
    }
  }, [isDemo, organizationId, plan, role, subscriptionStatus, userId]);
  return null;
}
