export const DEMO_ROLES = ["ADMIN", "CASHIER", "PHARM_TECH", "DOCTOR"] as const;

export type DemoRole = (typeof DEMO_ROLES)[number];

export const DEMO_ROLE_EMAILS: Record<DemoRole, string> = {
  ADMIN: "admin@pharmacy.local",
  CASHIER: "cashier@pharmacy.local",
  PHARM_TECH: "pharmtech@pharmacy.local",
  DOCTOR: "doctor@pharmacy.local",
};

export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === "string" && DEMO_ROLES.includes(value as DemoRole);
}
