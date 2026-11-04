"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DEFAULT_DEMO_PASSWORD,
  DEMO_LOGIN_EMAILS,
} from "@/lib/demo-credentials";

const isDev = process.env.NODE_ENV === "development";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Invalid email or password");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to open your workspace.
        </p>
      </div>

      {/* {isDev ? ( */}
        <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo credentials (after seed)</p>
          <p>
            <span className="text-foreground">Password</span> (all accounts):{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
              {DEFAULT_DEMO_PASSWORD}
            </code>
          </p>
          <p className="leading-relaxed">
            <span className="text-foreground">Emails:</span>{" "}
            {DEMO_LOGIN_EMAILS.map((e) => (
              <span key={e} className="block font-mono text-[11px] text-foreground/90">
                {e}
              </span>
            ))}
          </p>
        </div>
      {/* ) : null} */}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
