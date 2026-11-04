import type { UserRole } from "@prisma/client";

/** Primary POS workspace for the role (matches dashboard nav). */
export function posHomeHrefForRole(role: UserRole): string {
  switch (role) {
    case "CASHIER":
      return "/pos/cashier";
    case "ADMIN":
    case "PHARM_TECH":
      return "/pos";
    case "DOCTOR":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}

export function posBackLabelForRole(role: UserRole): string {
  switch (role) {
    case "CASHIER":
      return "Back to Cashier POS";
    case "DOCTOR":
      return "Back to Overview";
    default:
      return "Back to POS";
  }
}
