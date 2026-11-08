"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { UserRole } from "@prisma/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  UserCog,
  Settings,
  ReceiptText,
  BarChart3,
  Pill,
  LogOut,
  Shield,
  MessageCircle,
  Truck,
  Stethoscope,
  ClipboardList,
  Wallet,
  CreditCard,
  UserRound,
} from "lucide-react";
import {
  PharmacyAssistantProvider,
  usePharmacyAssistant,
} from "@/components/pharmacy-assistant";
import { Badge } from "@/components/ui/badge";
import type { NavBadgeCounts } from "@/lib/nav-badge-counts";
import { refreshNavBadgeCounts } from "@/lib/actions/nav-badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "CASHIER", "PHARM_TECH", "DOCTOR"] },
  { href: "/pos", label: "POS", icon: ShoppingCart, roles: ["ADMIN", "PHARM_TECH"] },
  { href: "/pos/cashier", label: "Cashier POS", icon: ShoppingCart, roles: ["CASHIER"] },
  { href: "/pos/dispense", label: "Dispensing", icon: Package, roles: ["ADMIN", "PHARM_TECH"] },
  { href: "/consultations", label: "Consultations", icon: ClipboardList, roles: ["ADMIN", "PHARM_TECH", "CASHIER"] },
  { href: "/doctor", label: "Doctor", icon: Stethoscope, roles: ["DOCTOR"] },
  { href: "/inventory/drugs", label: "Drugs", icon: Pill, roles: ["ADMIN", "PHARM_TECH", "CASHIER"] },
  { href: "/inventory/batches", label: "Batches & stock", icon: Package, roles: ["ADMIN", "PHARM_TECH", "CASHIER"] },
  { href: "/patients", label: "Patients", icon: Users, roles: ["ADMIN", "PHARM_TECH", "DOCTOR"] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: ["ADMIN"] },
  { href: "/admin/finance", label: "Finance", icon: Wallet, roles: ["ADMIN"] },
  { href: "/admin/sales", label: "Sales", icon: ReceiptText, roles: ["ADMIN", "CASHIER", "PHARM_TECH"] },
  { href: "/admin/insurers", label: "Insurance", icon: Shield, roles: ["ADMIN"] },
  { href: "/admin/deleted-batches", label: "Deleted batches", icon: Package, roles: ["ADMIN"] },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck, roles: ["ADMIN"] },
  { href: "/admin/users", label: "Users", icon: UserCog, roles: ["ADMIN"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
  { href: "/billing", label: "Billing", icon: CreditCard, roles: ["ADMIN"] },
];

function AskPharmacySidebarItem() {
  const { setOpen } = usePharmacyAssistant();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 gap-3 rounded-lg px-3 text-[13px] font-medium transition-all hover:bg-sidebar-primary/10 [&_svg]:size-[18px] [&_svg]:shrink-0"
      >
        <MessageCircle className="opacity-90" />
        <span>Ask my pharmacy</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavCountPill({ count }: { count: number }) {
  if (count < 1) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <Badge
      variant="default"
      className="ml-auto h-5 min-w-5 shrink-0 rounded-full border-0 bg-sidebar-primary px-1.5 text-[10px] font-semibold tabular-nums text-sidebar-primary-foreground shadow-none"
    >
      {label}
    </Badge>
  );
}

export function DashboardShell({
  children,
  role,
  userName,
  userEmail,
  navBadgeCounts: initialNavBadgeCounts = {},
  orgBranding,
  billing,
  demo,
}: {
  children: React.ReactNode;
  role: UserRole;
  userName: string | null | undefined;
  userEmail: string;
  navBadgeCounts?: NavBadgeCounts;
  orgBranding?: {
    name: string;
    tagline: string;
    logoUrl: string | null;
  };
  billing?: { status: "TRIALING" | "ACTIVE" | "GRACE" | "PAST_DUE" | "EXPIRED" | "CANCELLED"; accessEndsAt: Date };
  demo?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navBadgeCounts, setNavBadgeCounts] =
    useState<NavBadgeCounts>(initialNavBadgeCounts);

  useEffect(() => {
    let cancelled = false;
    refreshNavBadgeCounts().then((next) => {
      if (!cancelled) setNavBadgeCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const visible = links.filter((l) => l.roles.includes(role));

  const activeHref = useMemo(() => {
    // Pick the most specific matching href so nested routes don't light up multiple items.
    // Example: /pos/dispense should activate /pos/dispense (not /pos).
    let best: string | null = null;
    for (const l of visible) {
      const href = l.href;
      const exact = pathname === href;
      const nested = href !== "/dashboard" && pathname.startsWith(`${href}/`);
      if (!exact && !nested) continue;
      if (!best || href.length > best.length) best = href;
    }
    return best ?? "/dashboard";
  }, [pathname, visible]);

  const branding = orgBranding ?? {
    name: "Pharmacy OS",
    tagline: "Clinical operations",
    logoUrl: null,
  };

  return (
    <PharmacyAssistantProvider>
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17.5rem",
        } as React.CSSProperties
      }
    >
      <Sidebar variant="floating" className="border-0 print:hidden">
        <SidebarHeader className="gap-0 border-b border-sidebar-border/70 px-4 pb-5 pt-4">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3 rounded-xl p-1.5 -m-1.5 transition-colors hover:bg-sidebar-accent/80"
          >
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-sidebar-primary to-primary text-sidebar-primary-foreground shadow-md ring-1 ring-sidebar-primary/20">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoUrl}
                  alt={`${branding.name} logo`}
                  className="h-full w-full object-contain bg-white/90 p-1"
                  loading="eager"
                />
              ) : (
                <Pill className="size-[22px]" strokeWidth={2.25} />
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <span className="truncate font-semibold tracking-tight text-sidebar-foreground">
                {branding.name}
              </span>
              <p className="truncate text-xs font-medium text-muted-foreground">
                {branding.tagline}
              </p>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2 pt-4">
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/90">
              Navigate
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {visible.map((item) => {
                  const Icon = item.icon;
                  const active = activeHref === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className="h-10 gap-3 rounded-lg px-3 text-[13px] font-medium transition-all data-[active=true]:bg-sidebar-primary/12 data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary data-[active=true]:shadow-[inset_3px_0_0_0_var(--sidebar-primary)] [&_svg]:size-[18px] [&_svg]:shrink-0"
                      >
                        <Link
                          href={item.href}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <Icon className="shrink-0 opacity-90" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          <NavCountPill
                            count={navBadgeCounts[item.href as keyof NavBadgeCounts] ?? 0}
                          />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                <AskPharmacySidebarItem />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-3 border-t border-sidebar-border/70 p-4">
          <div className="rounded-xl border border-sidebar-border/80 bg-sidebar-accent/40 px-3 py-3 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">Signed in</div>
            <div className="mt-0.5 truncate text-sm font-semibold text-sidebar-foreground">
              {userName ?? userEmail}
            </div>
            {userName && (
              <div className="truncate text-xs text-muted-foreground">{userEmail}</div>
            )}
            <div className="mt-2 inline-flex rounded-md bg-background/60 px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground ring-1 ring-sidebar-border/60">
              {role.toLowerCase().replace("_", " ")}
            </div>
          </div>
          <Button
            variant="ghost"
            className="h-10 w-full justify-start gap-2.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md print:hidden md:px-6">
          <SidebarTrigger className="-ml-1 rounded-lg" />
          <Separator orientation="vertical" className="h-5 bg-border/70" />
          <span className="text-sm text-muted-foreground">Workspace</span>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg"
                  aria-label="User menu"
                >
                  <UserRound className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {userName ?? userEmail}
                  </div>
                  {userName ? (
                    <div className="truncate text-xs font-normal text-muted-foreground">
                      {userEmail}
                    </div>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
                  }}
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 size-4" aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex flex-1 flex-col bg-linear-to-b from-muted/30 to-background px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
            {demo ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0e2e28] px-4 py-3 text-sm text-white shadow-[0_10px_26px_rgba(14,46,40,0.16)]"><div><p className="font-semibold">This is a sample pharmacy. Ready to see your own numbers?</p><p className="text-xs leading-5 text-[#b9d8d1]">Explore freely, then create your workspace when you’re ready. Sample data may reset between visits.</p></div><Button asChild size="sm" className="bg-[#72ddc9] text-[#0e2e28] hover:bg-white"><Link href="/api/auth/clear?redirectTo=/register">Create my pharmacy</Link></Button></div> : null}
            {!demo && billing && billing.status !== "ACTIVE" && <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${billing.status === "EXPIRED" || billing.status === "CANCELLED" ? "border-red-200 bg-red-50 text-red-950" : billing.status === "GRACE" || billing.status === "PAST_DUE" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-950"}`}><div><p className="font-semibold">{billing.status === "TRIALING" ? "Your 30-day trial is active" : billing.status === "GRACE" || billing.status === "PAST_DUE" ? "Payment is due — you’re in the grace period" : "Your subscription needs attention"}</p><p className="text-xs opacity-75">{billing.status === "TRIALING" ? `Trial ends ${new Date(billing.accessEndsAt).toLocaleDateString("en-KE")}. Subscribe any time to keep everything running.` : "Update billing to keep your team’s access uninterrupted."}</p></div>{role === "ADMIN" && <Button asChild size="sm"><Link href="/billing"><CreditCard /> Manage billing</Link></Button>}</div>}
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </PharmacyAssistantProvider>
  );
}
