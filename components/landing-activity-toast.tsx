"use client";

import { useEffect, useState } from "react";
import { Building2, X } from "lucide-react";
import activityLocations from "@/data/landing-activity.json";

const cities = activityLocations.map(({ city }) => city);
const INITIAL_DELAY = { minimum: 90_000, maximum: 180_000 };
const REPEAT_DELAY = { minimum: 8 * 60_000, maximum: 15 * 60_000 };
const VISIBLE_DURATION = 8_000;

function randomDelay(minimum: number, maximum: number) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

export function LandingActivityToast() {
  const [index, setIndex] = useState(-1);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!cities.length || dismissed) return;
    let previous = -1;
    let showTimer: number;
    let hideTimer: number;

    const scheduleNext = (minimum: number, maximum: number) => {
      showTimer = window.setTimeout(showNext, randomDelay(minimum, maximum));
    };

    const showNext = () => {
      let next = Math.floor(Math.random() * cities.length);
      if (cities.length > 1 && next === previous) next = (next + 1) % cities.length;
      previous = next;
      setIndex(next);
      hideTimer = window.setTimeout(() => {
        setIndex(-1);
        scheduleNext(REPEAT_DELAY.minimum, REPEAT_DELAY.maximum);
      }, VISIBLE_DURATION);
    };

    scheduleNext(INITIAL_DELAY.minimum, INITIAL_DELAY.maximum);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
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
          <p className="text-sm font-semibold leading-5">More pharmacy teams are discovering Pharmacy OS</p>
          <p className="mt-1 text-xs leading-5 text-[#b9d5ce]">Built for growing businesses across Kenya—from {cities[index]} to wherever care happens.</p>
        </div>
        <button type="button" onClick={() => { setIndex(-1); setDismissed(true); }} className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72ddc9]" aria-label="Dismiss activity notification">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
