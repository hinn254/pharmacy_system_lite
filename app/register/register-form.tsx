"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerOrganization } from "@/lib/actions/register";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [pharmacyName, setPharmacyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match. Re-enter them and try again.");
      return;
    }
    setLoading(true);
    try {
      const res = await registerOrganization({
        pharmacyName,
        email,
        phoneNumber,
        password,
        name: name.trim(),
      });
      if (!res.ok) {
        setErrorMessage(res.error);
        return;
      }
      const { error } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        callbackURL: callbackUrl,
      });
      if (error) {
        toast.success("Account created. Please sign in.");
        router.push("/login");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.025em]">
          Create your pharmacy
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Start with the business name and your owner account. You can configure everything else from the dashboard.
        </p>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl bg-destructive/8 px-3.5 py-3 text-sm leading-relaxed text-destructive ring-1 ring-destructive/20"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Your business</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This is the name your team will see across the workspace.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pharmacyName">Pharmacy name</Label>
          <Input
            id="pharmacyName"
            name="pharmacyName"
            autoComplete="organization"
            value={pharmacyName}
            onChange={(e) => setPharmacyName(e.target.value)}
            placeholder="e.g. Nairobi Central Pharmacy"
            required
            minLength={2}
            maxLength={128}
          />
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Your owner account</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            You will have administrator access and can invite staff later.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-name">Full name</Label>
          <Input
            id="reg-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            minLength={2}
            maxLength={128}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email">Work email</Label>
          <Input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-phone">Phone number</Label>
          <Input
            id="reg-phone"
            name="phoneNumber"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 0712 345 678"
            required
            maxLength={32}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            We will use this to contact you about your pharmacy account.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="reg-password">Password</Label>
            <span className="text-xs text-muted-foreground">At least 8 characters</span>
          </div>
          <div className="relative">
            <Input
              id="reg-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              className="pr-11"
              aria-invalid={Boolean(errorMessage && password !== confirmPassword)}
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="pr-11"
              aria-invalid={Boolean(errorMessage && password !== confirmPassword)}
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Creating your pharmacy…" : "Create pharmacy and continue"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Staff joining an existing pharmacy should use their invitation email.
      </p>
    </form>
  );
}
