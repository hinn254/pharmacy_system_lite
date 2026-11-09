"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CreditCard,
  FlaskConical,
  Menu,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const productLinks = [
  { href: "/features/pharmacy-pos", label: "Pharmacy POS", shortLabel: "POS", description: "Checkout built around medicines", icon: ShoppingCart },
  { href: "/features/inventory-management", label: "Inventory", shortLabel: "Inventory", description: "Batches, expiry and stock control", icon: Boxes },
  { href: "/features/mpesa-payments", label: "M-Pesa", shortLabel: "M-Pesa", description: "Payments connected to each sale", icon: CreditCard },
  { href: "/features/insurance-management", label: "Insurance", shortLabel: "Insurance", description: "Schemes, claims and invoices", icon: ShieldCheck },
  { href: "/features/consultations", label: "Consultations", shortLabel: "Consultations", description: "Patient and medication workflows", icon: Stethoscope },
  { href: "/features/pharmacy-analytics", label: "Analytics", shortLabel: "Analytics", description: "Sales and stock decisions", icon: BarChart3 },
] as const;

const startLinks = [
  { href: "/pricing", label: "Pricing", description: "Compare monthly and annual plans", icon: ReceiptText },
  { href: "/demo", label: "Live demo", description: "Explore a prepared sample pharmacy", icon: FlaskConical },
] as const;

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader({ initialAuthenticated = false }: { initialAuthenticated?: boolean }) {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const authenticated = isPending ? initialAuthenticated : Boolean(session?.user);
  const primaryHref = authenticated ? "/dashboard" : "/register";
  const primaryLabel = authenticated ? "Open dashboard" : "Create pharmacy";

  return (
    <header className="sticky top-0 z-40 border-b border-[#143e36]/10 bg-[#f4f8f6]/95 text-[#102521] backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78] focus-visible:ring-offset-4" aria-label="Pharmacy OS home">
          <BrandMark className="size-10 shrink-0 text-[#006b5d] shadow-sm" />
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold tracking-[-0.02em]">Pharmacy OS</span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.12em] text-[#55706a] sm:block">Built for the whole pharmacy</span>
          </span>
        </Link>

        <nav aria-label="Public navigation" className="hidden items-center gap-5 text-sm font-medium text-[#49635d] xl:flex">
          {productLinks.filter(({ href }) => href !== "/features/mpesa-payments" && href !== "/features/consultations").map(({ href, label, shortLabel }) => (
            <Link key={href} href={href} aria-current={isCurrentPath(pathname, href) ? "page" : undefined} className={cn("rounded-md py-2 transition-colors hover:text-[#006b5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78]", isCurrentPath(pathname, href) && "text-[#006b5d]")}>{shortLabel ?? label}</Link>
          ))}
          {startLinks.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={isCurrentPath(pathname, href) ? "page" : undefined} className={cn("rounded-md py-2 transition-colors hover:text-[#006b5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78]", isCurrentPath(pathname, href) && "text-[#006b5d]")}>{label === "Live demo" ? "Demo" : label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {!authenticated ? <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-[#294a43] transition-colors hover:bg-white/70 hover:text-[#006b5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78]">Sign in</Link> : null}
          <Link href={primaryHref} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#006b5d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00594e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78] focus-visible:ring-offset-2">
            {primaryLabel}<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="inline-flex size-11 items-center justify-center rounded-lg border border-[#173a33]/15 bg-white/75 text-[#173a33] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78] xl:hidden" aria-label="Open navigation menu">
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(92vw,25rem)] border-[#173a33]/12 bg-[#f4f8f6] p-0 text-[#102521] sm:max-w-md">
            <SheetHeader className="border-b border-[#173a33]/10 px-5 pb-5 pt-6 pr-16 text-left">
              <SheetTitle className="flex items-center gap-3 text-lg font-semibold tracking-[-0.02em]">
                <BrandMark className="size-9 text-[#006b5d]" /> Pharmacy OS
              </SheetTitle>
              <SheetDescription className="mt-2 text-sm leading-6 text-[#617871]">Choose a workflow or continue to your pharmacy workspace.</SheetDescription>
            </SheetHeader>

            <nav aria-label="Mobile navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6a817b]">Product</p>
              <div className="grid gap-1">
                {productLinks.map(({ href, label, description, icon: Icon }) => (
                  <SheetClose asChild key={href}>
                    <Link href={href} aria-current={isCurrentPath(pathname, href) ? "page" : undefined} className={cn("group flex min-h-16 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78]", isCurrentPath(pathname, href) && "bg-[#dff1ec]")}> 
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#006b5d] ring-1 ring-[#173a33]/10", isCurrentPath(pathname, href) && "bg-[#006b5d] text-white ring-0")}><Icon className="size-4.5" aria-hidden="true" /></span>
                      <span><span className="block text-sm font-semibold text-[#173a33]">{label}</span><span className="mt-0.5 block text-xs leading-5 text-[#617871]">{description}</span></span>
                    </Link>
                  </SheetClose>
                ))}
              </div>

              <p className="mt-6 px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6a817b]">Explore</p>
              <div className="grid grid-cols-2 gap-2 px-1">
                {startLinks.map(({ href, label, icon: Icon }) => (
                  <SheetClose asChild key={href}>
                    <Link href={href} aria-current={isCurrentPath(pathname, href) ? "page" : undefined} className={cn("flex min-h-14 items-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-[#294a43] ring-1 ring-[#173a33]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78]", isCurrentPath(pathname, href) && "bg-[#dff1ec] text-[#006b5d]")}><Icon className="size-4 text-[#006b5d]" aria-hidden="true" />{label}</Link>
                  </SheetClose>
                ))}
              </div>
            </nav>

            <SheetFooter className="border-t border-[#173a33]/10 bg-white/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {!authenticated ? <SheetClose asChild><Link href="/login" className="inline-flex h-12 items-center justify-center rounded-lg bg-white text-sm font-semibold text-[#294a43] ring-1 ring-[#173a33]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78]">Sign in</Link></SheetClose> : null}
              <SheetClose asChild><Link href={primaryHref} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#006b5d] px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008c78] focus-visible:ring-offset-2">{primaryLabel}<ArrowRight className="size-4" aria-hidden="true" /></Link></SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
