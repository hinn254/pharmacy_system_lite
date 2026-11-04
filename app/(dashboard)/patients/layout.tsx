import { requireRoles } from "@/lib/authz";

export default async function PatientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN", "PHARM_TECH", "DOCTOR");
  return children;
}
