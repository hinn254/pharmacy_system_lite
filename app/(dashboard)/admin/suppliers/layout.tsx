import { requireRoles } from "@/lib/authz";

export default async function AdminSuppliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN");
  return children;
}

