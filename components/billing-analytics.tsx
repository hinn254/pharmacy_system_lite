"use client";

import { useEffect } from "react";
import { captureClientEvent } from "@/lib/analytics/client";

export function BillingAnalytics() {
  useEffect(() => {
    captureClientEvent("billing_page_viewed", {});
  }, []);
  return null;
}
