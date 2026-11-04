import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";
import { redirectToLoginClearingSession } from "@/lib/auth-redirect";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirectToLoginClearingSession();
  return session;
}

export async function requireRoles(...allowed: UserRole[]) {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    redirect("/dashboard");
  }
  return session;
}

export function canManageInventory(role: UserRole) {
  return role === "ADMIN" || role === "PHARM_TECH";
}

/** Use in server actions after `auth()` when mutating batches, drugs, or suppliers. */
export function assertCanMutateInventory(role: UserRole | undefined) {
  if (role == null || !canManageInventory(role)) {
    throw new Error("Unauthorized");
  }
}

export function canManageUsers(role: UserRole) {
  return role === "ADMIN";
}

export function canViewAnalytics(role: UserRole) {
  return role === "ADMIN";
}
