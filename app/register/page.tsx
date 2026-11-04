import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  // See login page: avoid RSC redirect when session; middleware handles it.

  return (
    <AuthShell
      variant="register"
      footer={
        <>
          Already manage a pharmacy here?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in to your account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
