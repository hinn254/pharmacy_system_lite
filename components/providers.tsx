"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerCleanup } from "@/components/service-worker-cleanup";
import { AnalyticsPageView } from "@/components/analytics-page-view";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ServiceWorkerCleanup />
      <AnalyticsPageView />
      {children}
      <Toaster richColors position="top-center" />
    </TooltipProvider>
  );
}
