"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_DEMO_PASSWORD,
  DEMO_LOGIN_EMAILS,
} from "@/lib/demo-credentials";
import { DEMO_ROLE_EMAILS, type DemoRole } from "@/lib/demo-roles";

const isDevelopment = process.env.NODE_ENV === "development";

export function LoginForm({
  initialDemoRole,
  demoPassword,
}: {
  initialDemoRole: DemoRole | null;
  demoPassword?: string;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState(initialDemoRole ? DEMO_ROLE_EMAILS[initialDemoRole] : "");
  const [password, setPassword] = useState(initialDemoRole ? demoPassword ?? DEFAULT_DEMO_PASSWORD : "");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: callbackUrl,
      });
      if (error) {
        setErrorMessage(
          "We couldn't sign you in. Check your email and password, then try again.",
        );
        return;
      }
      // Use a document navigation so the HttpOnly session cookie is available
      // before the first protected page request in production.
      window.location.assign(callbackUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.025em]">
          {initialDemoRole ? "Sign in to the sample pharmacy" : "Sign in to your pharmacy"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {initialDemoRole
            ? "The demo credentials are ready. Press Sign in to open this role’s workspace."
            : "Use the account your pharmacy owner created or invited."}
        </p>
      </div>

      {initialDemoRole ? (
        <div className="rounded-xl bg-emerald-50 px-3.5 py-3 text-sm leading-relaxed text-emerald-950 ring-1 ring-emerald-200">
          This is a shared demo account. Use sample information only; never enter real patient or business data.
        </div>
      ) : null}

      {isDevelopment ? (
        <div className="space-y-3 rounded-xl bg-muted/60 p-3.5 ring-1 ring-border/70">
          <div>
            <p className="text-sm font-medium text-foreground">Try a demo role</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Available only in development after running the seed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_LOGIN_EMAILS.map((demoEmail) => (
              <button
                key={demoEmail}
                type="button"
                className="min-h-10 rounded-lg bg-background px-3 text-left text-xs font-medium capitalize text-foreground ring-1 ring-border transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setEmail(demoEmail);
                  setPassword(demoPassword ?? DEFAULT_DEMO_PASSWORD);
                  setErrorMessage(null);
                }}
              >
                {demoEmail.split("@")[0]?.replace("pharmtech", "pharm tech")}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl bg-destructive/8 px-3.5 py-3 text-sm leading-relaxed text-destructive ring-1 ring-destructive/20"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={Boolean(errorMessage)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <span className="text-xs text-muted-foreground">At least 8 characters</span>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="pr-11"
              aria-invalid={Boolean(errorMessage)}
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Joining an existing pharmacy? Open the invitation sent to your email.
      </p>
    </form>
  );
}
