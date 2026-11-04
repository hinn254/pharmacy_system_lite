"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BillingCheckoutButton({ interval, method, children, variant = "default" }: { interval: "MONTHLY" | "ANNUAL"; method: "CARD" | "MPESA"; children: React.ReactNode; variant?: "default" | "outline" }) {
  const [loading, setLoading] = useState(false);
  return <Button variant={variant} className="w-full" disabled={loading} onClick={async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ interval, method }) });
      const body = await response.json() as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "Could not start checkout");
      window.location.assign(body.url);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not start checkout"); setLoading(false); }
  }}>{loading ? <><LoaderCircle className="animate-spin" /> Opening Paystack…</> : children}</Button>;
}

export function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  return <Button variant="ghost" size="sm" disabled={loading} onClick={async () => {
    if (!window.confirm("Turn off automatic renewal? Your access continues until the end of the paid period.")) return;
    setLoading(true);
    const response = await fetch("/api/billing/cancel", { method: "POST" });
    const body = await response.json() as { error?: string };
    if (!response.ok) { toast.error(body.error || "Could not cancel renewal"); setLoading(false); return; }
    toast.success("Automatic renewal has been turned off");
    window.location.reload();
  }}>{loading ? "Cancelling…" : "Turn off automatic renewal"}</Button>;
}
