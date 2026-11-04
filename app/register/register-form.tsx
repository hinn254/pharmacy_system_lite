"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerOrganization } from "@/lib/actions/register";
import { slugify } from "@/lib/slugify";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [pharmacyName, setPharmacyName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const slugPreview = useMemo(() => {
    const raw =
      slugTouched && slug.trim() ? slug : pharmacyName;
    return slugify(raw);
  }, [slug, pharmacyName, slugTouched]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await registerOrganization({
        pharmacyName,
        slug: slugTouched && slug.trim() ? slug : undefined,
        email,
        password,
        name: name.trim() || null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (sign?.error) {
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
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Register your pharmacy</h2>
        <p className="text-sm text-muted-foreground">
          You will be the administrator for this workspace.
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

      <div className="space-y-2">
        <Label htmlFor="slug">URL slug (optional)</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          onBlur={() => {
            if (slug.trim()) setSlugTouched(true);
          }}
          placeholder={slugify(pharmacyName || "your-pharmacy")}
          maxLength={80}
          aria-describedby="slug-hint"
        />
        <p id="slug-hint" className="text-xs text-muted-foreground">
          Unique id: <span className="font-mono text-foreground/90">{slugPreview}</span>. A number is
          appended if this id is already taken.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-name">Your name (optional)</Label>
        <Input
          id="reg-name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          maxLength={128}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
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
        <Label htmlFor="reg-password">Password</Label>
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
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Creating workspace…" : "Create pharmacy"}
      </Button>
    </form>
  );
}
