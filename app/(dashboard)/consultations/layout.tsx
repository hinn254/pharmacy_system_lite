import { requireRoles } from "@/lib/authz";

export default async function ConsultationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN", "PHARM_TECH", "DOCTOR", "CASHIER");
  return children;
}

