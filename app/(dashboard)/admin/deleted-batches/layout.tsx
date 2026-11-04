import { requireRoles } from "@/lib/authz";

export default async function AdminDeletedBatchesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN");
  return children;
}

