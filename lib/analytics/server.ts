import "server-only";

import { PostHog } from "posthog-node";
import { prisma } from "@/lib/prisma";
import {
  analyticsEnvironment,
  type AnalyticsEventName,
  type AnalyticsEventProperties,
} from "./events";

type ServerIdentity = { organizationId: string; userId?: string; userRole?: string };

export async function captureServerEvent<E extends AnalyticsEventName>(
  identity: ServerIdentity,
  event: E,
  properties: AnalyticsEventProperties[E],
): Promise<void> {
  const key = process.env.POSTHOG_PROJECT_TOKEN ?? process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host || process.env.NODE_ENV === "development") return;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: identity.organizationId },
      select: {
        isDemo: true,
        subscription: { select: { planCode: true, status: true } },
      },
    });
    if (!org) return;

    const client = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
      disableGeoip: true,
    });
    client.capture({
      distinctId: identity.userId ?? `organization:${identity.organizationId}`,
      event,
      groups: { organization: identity.organizationId },
      properties: {
        ...properties,
        organization_id: identity.organizationId,
        user_id: identity.userId,
        user_role: identity.userRole,
        subscription_plan: org.subscription?.planCode,
        subscription_status: org.subscription?.status,
        is_demo: org.isDemo,
        environment: analyticsEnvironment(),
        app_version: process.env.VERCEL_GIT_COMMIT_SHA,
        $process_person_profile: false,
      },
    });
    await client.shutdown(2_000);
  } catch (error) {
    console.warn(`[analytics] Failed to capture ${event}`, error);
  }
}
