"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Play } from "lucide-react";

export function StartDemoButton() {
  const router = useRouter();
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
      router.push("/dashboard");
      router.refresh();
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
        {loading ? "Preparing your demo…" : "Explore the live demo"}
        {!loading ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
      </button>
      {error ? <p role="alert" className="mt-2 max-w-sm text-sm font-medium text-[#9b2c2c]">{error}</p> : null}
    </div>
  );
}
