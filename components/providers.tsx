"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerCleanup } from "@/components/service-worker-cleanup";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ServiceWorkerCleanup />
      {children}
      <Toaster richColors position="top-center" />
    </TooltipProvider>
  );
}
