"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { posthog } from "@/lib/analytics/client";
import { normalizeAnalyticsRoute, routeAccess } from "@/lib/analytics/route-normalizer";

export function AnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    const route = normalizeAnalyticsRoute(pathname);
    try {
      posthog.capture("$pageview", {
        $current_url: route,
        route,
        access: routeAccess(route),
      });
    } catch {
      // Navigation must not depend on telemetry.
    }
  }, [pathname]);

  return null;
}
