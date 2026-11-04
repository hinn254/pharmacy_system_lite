import { requireRoles } from "@/lib/authz";

export default async function AdminInsurersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN");
  return children;
}

