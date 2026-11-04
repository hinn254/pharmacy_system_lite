import { requireRoles } from "@/lib/authz";

export default async function AdminAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRoles("ADMIN");
  return children;
}

