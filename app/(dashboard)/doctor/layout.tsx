import { requireRoles } from "@/lib/authz";

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("DOCTOR");
  return children;
}

