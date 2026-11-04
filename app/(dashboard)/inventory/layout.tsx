import { requireRoles } from "@/lib/authz";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN", "PHARM_TECH", "CASHIER");
  return children;
}
