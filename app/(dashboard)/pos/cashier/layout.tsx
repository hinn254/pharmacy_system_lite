import { requireRoles } from "@/lib/authz";

export default async function CashierPosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("CASHIER");
  return children;
}

