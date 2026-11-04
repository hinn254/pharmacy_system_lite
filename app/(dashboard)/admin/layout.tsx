import { requireRoles } from "@/lib/authz";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN", "CASHIER", "PHARM_TECH");
  return children;
}
