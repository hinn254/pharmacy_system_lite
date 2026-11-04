import type { SubscriptionInterval } from "@prisma/client";

export const TRIAL_DAYS = 30;
export const GRACE_DAYS = 7;

export const BILLING_PLANS = {
  MONTHLY: { label: "Monthly", amountMinor: 199_900, interval: "monthly" },
  ANNUAL: { label: "Annual", amountMinor: 1_999_000, interval: "annually" },
} as const satisfies Record<SubscriptionInterval, { label: string; amountMinor: number; interval: string }>;

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function addBillingInterval(date: Date, interval: SubscriptionInterval) {
  const next = new Date(date);
  if (interval === "ANNUAL") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

export function formatKes(amountMinor: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amountMinor / 100);
}
