import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Logged-in users are redirected by middleware; do not `redirect("/dashboard")` here —
  // server `auth()` and edge `req.auth` can disagree and cause ERR_TOO_MANY_REDIRECTS.

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
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
