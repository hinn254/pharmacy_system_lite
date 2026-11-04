import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AuthShellVariant = "login" | "register";

type Bullet = { icon: LucideIcon; title: string; description: string };

const PANEL: Record<
  AuthShellVariant,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    bullets: Bullet[];
    footnote: string;
  }
> = {
  login: {
    eyebrow: "Sign in",
    title: "Welcome back",
    subtitle:
      "Pick up where you left off — ring up sales, check stock, and keep your dispensary running smoothly.",
    bullets: [
      {
        icon: ShoppingCart,
        title: "POS that fits retail pharmacy",
        description: "Fast search, insurance pricing, and clear receipts at the counter.",
      },
      {
        icon: Package,
        title: "Inventory you can trust",
        description: "Batches, expiry, FEFO allocation, and low-stock signals before you run out.",
      },
      {
        icon: ShieldCheck,
        title: "Built for teams & compliance",
        description: "Cashier, pharm tech, and admin roles with an audit trail you can stand behind.",
      },
    ],
    footnote: "Session‑scoped to your pharmacy · Data stays isolated per organization",
  },
  register: {
    eyebrow: "Get started",
    title: "Create your pharmacy",
    subtitle:
      "Spin up a dedicated workspace in minutes. You’ll be the admin — invite cashiers and techs when you’re ready.",
    bullets: [
      {
        icon: Building2,
        title: "Your own organization",
        description: "Separate catalog, clients, and sales history — nothing shared with other pharmacies.",
      },
      {
        icon: UserRoundCog,
        title: "You start as admin",
        description: "Manage users, settings, and integrations; scale the team without losing control.",
      },
      {
        icon: Sparkles,
        title: "Ready for real operations",
        description: "Tax defaults, receipt placeholders, and M‑Pesa sandbox — tune the rest in settings.",
      },
    ],
    footnote: "One email per pharmacy workspace · Add more staff accounts anytime",
  },
};

type AuthShellProps = {
  variant: AuthShellVariant;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ variant, children, footer }: AuthShellProps) {
  const copy = PANEL[variant];

  return (
    <div className="relative flex min-h-screen flex-col bg-linear-to-br from-primary/[0.07] via-background to-accent/30 md:flex-row">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-1/4 top-0 h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <aside
        className={cn(
          "relative flex flex-col border-b border-border/60 px-8 py-10 md:w-[44%] md:min-h-screen md:border-b-0 md:border-r md:py-12 lg:px-12",
          "bg-card/30 backdrop-blur-md",
        )}
      >
        {/* subtle grid + tint */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
          aria-hidden
          style={{
            backgroundImage: `
              radial-gradient(circle at 1px 1px, oklch(0.5 0.05 195 / 0.12) 1px, transparent 0)
            `,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/6 via-transparent to-transparent" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2.5 rounded-xl text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/25">
              Rx
            </span>
            <span className="flex flex-col leading-tight">
              <span>Pharmacy OS</span>
              <span className="text-xs font-normal text-muted-foreground">
                Operations for dispensaries
              </span>
            </span>
          </Link>

          <div className="mt-8 md:mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 max-w-md text-balance font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-[2.35rem] lg:leading-[1.15]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-md text-pretty text-base text-muted-foreground leading-relaxed">
              {copy.subtitle}
            </p>
          </div>

          <ul className="mt-10 flex flex-col gap-5 md:mt-12">
            {copy.bullets.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/10">
                  <item.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="font-medium text-foreground leading-snug">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-10 max-w-md text-sm text-muted-foreground leading-relaxed md:mt-auto md:pt-10">
            {copy.footnote}
          </p>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col items-center justify-center p-6 md:p-10 lg:p-12">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-lg shadow-primary/5 backdrop-blur-md sm:p-8">
            {children}
          </div>
          <div className="text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  );
}
