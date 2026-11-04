import { requireRoles } from "@/lib/authz";

export default async function AdminSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN");
  return children;
}

