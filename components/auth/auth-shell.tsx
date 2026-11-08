import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CheckCircle2,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";

export type AuthShellVariant = "login" | "register";

type Bullet = { icon: LucideIcon; title: string; description: string };

const PANEL: Record<
  AuthShellVariant,
  {
    title: string;
    subtitle: string;
    bullets: Bullet[];
    footnote: string;
  }
> = {
  login: {
    title: "Your pharmacy, ready when you are.",
    subtitle:
      "Return to sales, stock, dispensing, and the daily work that keeps your pharmacy moving.",
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
    footnote: "Your session opens only the pharmacy and tools assigned to your account.",
  },
  register: {
    title: "Open your pharmacy workspace.",
    subtitle:
      "Create the owner account now. Your workspace opens ready for stock, staff, sales, and day-to-day setup.",
    bullets: [
      {
        icon: Building2,
        title: "A workspace for your business",
        description: "Your catalog, patients, sales, and settings stay separate from every other pharmacy.",
      },
      {
        icon: UserRoundCog,
        title: "You begin as the owner",
        description: "Configure the business, manage access, and invite staff when you are ready.",
      },
      {
        icon: Sparkles,
        title: "Start useful, refine as you go",
        description: "Open the dashboard immediately, then add stock, receipt details, payments, and your team.",
      },
    ],
    footnote: "Opening an existing team invitation? Use the link sent to your email instead.",
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
          "relative order-2 flex flex-col border-t border-border/60 px-6 py-8 md:order-1 md:min-h-screen md:w-[44%] md:border-r md:border-t-0 md:px-8 md:py-12 lg:px-12",
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
            className="hidden w-fit items-center gap-2.5 rounded-xl text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90 md:inline-flex"
          >
            <BrandMark className="size-10 text-primary shadow-md shadow-primary/25" />
            <span className="flex flex-col leading-tight">
              <span>Pharmacy OS</span>
              <span className="text-xs font-normal text-muted-foreground">
                Operations for dispensaries
              </span>
            </span>
          </Link>

          <div className="mt-8 hidden md:block md:mt-12">
            <h1 className="max-w-md text-balance font-heading text-3xl font-semibold tracking-[-0.025em] text-foreground md:text-4xl lg:text-[2.35rem] lg:leading-[1.15]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-md text-pretty text-base text-muted-foreground leading-relaxed">
              {copy.subtitle}
            </p>
          </div>

          <ul className="mt-10 hidden flex-col gap-5 md:mt-12 md:flex">
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

          <p className="mt-6 flex max-w-md items-start gap-2 text-sm leading-relaxed text-muted-foreground md:mt-auto md:pt-10">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {copy.footnote}
          </p>
        </div>
      </aside>

      <main className="relative order-1 flex flex-1 flex-col items-center justify-center p-5 pt-7 md:order-2 md:p-10 lg:p-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2.5 self-start rounded-xl text-lg font-semibold tracking-tight text-foreground md:hidden"
        >
          <BrandMark className="size-9 text-primary shadow-md shadow-primary/20" />
          <span>Pharmacy OS</span>
        </Link>
        <div className="w-full max-w-[420px] space-y-8">
          <div className="rounded-2xl bg-card p-6 shadow-[0_18px_55px_-30px_oklch(0.44_0.11_195_/_0.45)] ring-1 ring-border/80 sm:p-8">
            {children}
          </div>
          <div className="text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  );
}
