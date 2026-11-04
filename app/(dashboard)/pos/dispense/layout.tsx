import { requireRoles } from "@/lib/authz";

export default async function DispenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN", "PHARM_TECH");
  return children;
}

