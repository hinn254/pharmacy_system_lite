/**
 * Default password for seeded demo users. Keep in sync with `prisma/seed.ts`
 * (`SEED_DEMO_PASSWORD` overrides the seed only).
 */
export const DEFAULT_DEMO_PASSWORD = "Demo@Pharmacy2026";

export const DEMO_LOGIN_EMAILS = [
  "admin@pharmacy.local",
  "cashier@pharmacy.local",
  "pharmtech@pharmacy.local",
  "doctor@pharmacy.local",
] as const;
