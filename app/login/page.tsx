import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { DEFAULT_DEMO_PASSWORD } from "@/lib/demo-credentials";
import { isDemoRole } from "@/lib/demo-roles";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string | string[] }>;
}) {
  // Logged-in users are redirected by middleware; do not `redirect("/dashboard")` here —
  // server `auth()` and edge `req.auth` can disagree and cause ERR_TOO_MANY_REDIRECTS.
  const requestedDemoRole = (await searchParams).demo;
  const demoRole = isDemoRole(requestedDemoRole) ? requestedDemoRole : null;
  const demoPassword = demoRole || process.env.NODE_ENV === "development"
    ? process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD
    : undefined;

  return (
    <AuthShell
      variant="login"
      footer={
        <>
          Opening a new pharmacy?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create the owner account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <LoginForm initialDemoRole={demoRole} demoPassword={demoPassword} />
      </Suspense>
    </AuthShell>
  );
}
