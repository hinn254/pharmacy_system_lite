"use server";

import { getNavBadgeCounts, type NavBadgeCounts } from "@/lib/nav-badge-counts";

/** Refetch sidebar queue counts (e.g. after client navigation when the layout is not re-run). */
export async function refreshNavBadgeCounts(): Promise<NavBadgeCounts> {
  return getNavBadgeCounts();
}
