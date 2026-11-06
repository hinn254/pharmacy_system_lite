"use client";

import { useEffect, useState } from "react";
import { Building2, X } from "lucide-react";
import activityLocations from "@/data/landing-activity.json";

const cities = activityLocations.map(({ city }) => city);

function randomDelay(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

export function LandingActivityToast() {
  const [index, setIndex] = useState(-1);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!cities.length || dismissed) return;
    let previous = -1;
    let timer: number;
    const showNext = () => {
      let next = Math.floor(Math.random() * cities.length);
      if (cities.length > 1 && next === previous) next = (next + 1) % cities.length;
      previous = next;
      setIndex(next);
      timer = window.setTimeout(showNext, randomDelay(14_000, 24_000));
    };
    timer = window.setTimeout(showNext, randomDelay(3_500, 6_500));
    return () => window.clearTimeout(timer);
  }, [dismissed]);

  if (index < 0 || !cities[index]) return null;

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-3 fade-in duration-500 sm:bottom-6 sm:left-6 sm:w-[22rem]"
    >
      <div className="flex items-start gap-3 rounded-2xl bg-[#0e2e28] p-4 text-white shadow-[0_18px_50px_rgba(14,46,40,0.28)]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#72ddc9] text-[#0e2e28]">
          <Building2 className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5">A pharmacy in {cities[index]} recently joined Pharmacy OS</p>
          <p className="mt-1 text-xs leading-5 text-[#b9d5ce]">Another team is bringing stock, sales and patient care into one workspace.</p>
        </div>
        <button type="button" onClick={() => { setIndex(-1); setDismissed(true); }} className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72ddc9]" aria-label="Dismiss activity notification">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
