import { requireRoles } from "@/lib/authz";

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN");
  return children;
}

