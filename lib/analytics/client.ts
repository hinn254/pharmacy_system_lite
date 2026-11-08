"use client";

import posthog from "posthog-js";
import type { AnalyticsEventName, AnalyticsEventProperties } from "./events";

export function captureClientEvent<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEventProperties[E],
) {
  try {
    posthog.capture(event, properties);
  } catch {
    // Analytics must never interrupt a product workflow.
  }
}

export function resetAnalyticsIdentity() {
  try {
    posthog.reset();
  } catch {
    // Logout must continue even if analytics is unavailable.
  }
}

export { posthog };
