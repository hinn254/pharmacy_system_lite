"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle, Pill, ShieldCheck, ShoppingCart, Stethoscope } from "lucide-react";
import type { DemoRole } from "@/lib/demo-roles";

const roles: Array<{
  role: DemoRole;
  label: string;
  description: string;
  icon: typeof ShieldCheck;
}> = [
  { role: "ADMIN", label: "Administrator", description: "Reporting, finance, users and settings", icon: ShieldCheck },
  { role: "CASHIER", label: "Cashier", description: "Queue-based checkout and payments", icon: ShoppingCart },
  { role: "PHARM_TECH", label: "Pharmacy technologist", description: "Consultations, dispensing and stock", icon: Pill },
  { role: "DOCTOR", label: "Doctor", description: "Assigned consultations and medication orders", icon: Stethoscope },
];

export function DemoRolePicker() {
  const [loadingRole, setLoadingRole] = useState<DemoRole | null>(null);
  const [error, setError] = useState("");

  async function startDemo(role: DemoRole) {
    if (loadingRole) return;
    setLoadingRole(role);
    setError("");
    try {
      const response = await fetch("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "The demo could not be opened.");
      // The production demo requires a document navigation so the new role's
      // HttpOnly session cookie is applied before protected routes render.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The demo could not be opened.");
      setLoadingRole(null);
    }
  }

  return (
    <div>
      <div className="grid gap-px overflow-hidden rounded-2xl bg-[#173a33]/12 shadow-[0_20px_55px_rgba(22,55,48,0.08)] ring-1 ring-[#173a33]/12 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map(({ role, label, description, icon: Icon }) => {
          const loading = loadingRole === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => startDemo(role)}
              disabled={loadingRole !== null}
              className="group flex min-h-32 items-center gap-4 bg-white p-5 text-left transition-colors hover:bg-[#edf7f4] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78] disabled:cursor-wait disabled:opacity-65 sm:min-h-44 sm:flex-col sm:items-start sm:gap-0 sm:p-6 lg:min-h-52"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#dff1ec] text-[#006b5d] transition-colors group-hover:bg-[#006b5d] group-hover:text-white"><Icon className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 sm:mt-5 sm:flex-none">
                <span className="block text-base font-semibold text-[#173a33]">{label}</span>
                <span className="mt-1 block text-sm leading-6 text-[#617871] sm:mt-2">{description}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#006b5d] sm:mt-auto sm:pt-5">
                {loading ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /><span className="hidden sm:inline">Opening…</span></> : <><span className="hidden sm:inline">Open workspace</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></>}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p role="alert" className="mt-4 text-sm font-medium text-[#9b2c2c]">{error}</p> : null}
    </div>
  );
}
