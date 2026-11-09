"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Play } from "lucide-react";

export function StartDemoButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startDemo() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/demo/start", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "The demo could not be opened.");
      // A full navigation ensures the newly issued HttpOnly session cookie is
      // present before the first protected route is rendered. This also avoids
      // stale unauthenticated RSC/prefetch responses in production.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The demo could not be opened.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch sm:items-start">
      <button
        type="button"
        onClick={startDemo}
        disabled={loading}
        className="inline-flex h-13 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-[#173a33] ring-1 ring-[#173a33]/15 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#eaf3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006b5d] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4 fill-current" aria-hidden="true" />}
        {loading ? "Opening sample pharmacy…" : "See the sample pharmacy"}
        {!loading ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </button>
      {error ? <div role="alert" className="mt-2 max-w-sm text-sm text-[#9b2c2c]"><p className="font-medium">{error}</p><Link href="/register" className="mt-1 inline-flex font-semibold underline decoration-[#9b2c2c]/35 underline-offset-4 hover:decoration-current">Create your pharmacy instead</Link></div> : null}
    </div>
  );
}
