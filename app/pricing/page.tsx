import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BreadcrumbJsonLd, MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";
import { BILLING_PLANS, formatKes, TRIAL_DAYS } from "@/lib/billing/plans";

const title = "Pharmacy Software Pricing Kenya";
const description = `Compare monthly and annual Pharmacy OS pricing in Kenya. Start with a ${TRIAL_DAYS}-day trial and run POS, inventory, dispensing, insurance, finance and reporting.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/pricing" },
  openGraph: { title, description, url: "/pricing", type: "website", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
};

const included = [
  "Pharmacy POS and dispensing workflow",
  "Batch inventory, expiry and FEFO",
  "Patients, prescriptions and consultations",
  "Cash, M-Pesa and insurance records",
  "Supplier, finance and operational reporting",
  "Role-based staff accounts",
];

export default function PricingPage() {
  const monthly = BILLING_PLANS.MONTHLY;
  const annual = BILLING_PLANS.ANNUAL;
  return (
    <main className="min-h-screen bg-[#f4f8f6] text-[#102521]">
      <BreadcrumbJsonLd name="Pricing" path="/pricing" />
      <MarketingHeader />
      <section className="border-b border-[#143e36]/10"><div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:px-10 lg:py-24"><div><nav aria-label="Breadcrumb" className="text-sm text-[#617871]"><Link href="/" className="hover:text-[#006b5d]">Home</Link><span aria-hidden="true"> / </span><span>Pricing</span></nav><h1 className="mt-7 max-w-2xl text-balance text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">One subscription for the connected pharmacy workflow.</h1><p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[#526a64]">Start with a {TRIAL_DAYS}-day trial. Choose monthly flexibility or pay annually for the same Pharmacy OS workspace.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#006b5d] px-6 text-sm font-semibold text-white hover:bg-[#00594e]">Start your trial <ArrowRight className="size-4" aria-hidden="true" /></Link><Link href="/demo" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold ring-1 ring-[#173a33]/15 hover:bg-[#eaf3f0]">See the sample pharmacy</Link></div></div><div className="overflow-hidden rounded-2xl bg-[#0e2e28] p-2.5 shadow-[0_28px_80px_rgba(22,55,48,0.22)]"><div className="relative aspect-[1.2/1] overflow-hidden rounded-xl bg-white"><Image src="/product/dashboard-desktop.jpg" alt="Pharmacy OS dashboard included in the monthly and annual subscription" fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover object-top" /></div></div></div></section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(22,55,48,0.12)] lg:grid-cols-2">
          <div className="p-7 sm:p-10"><p className="text-sm font-semibold text-[#006b5d]">Monthly</p><p className="mt-5 text-5xl font-semibold tracking-[-0.04em]">{formatKes(monthly.amountMinor)}</p><p className="mt-2 text-[#617871]">per month</p><p className="mt-8 text-base leading-7 text-[#526a64]">A recurring monthly subscription when you prefer the shortest billing commitment.</p><Link href="/register" className="mt-9 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#006b5d] px-6 text-sm font-semibold text-white hover:bg-[#00594e]">Start your trial <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
          <div className="bg-[#0e2e28] p-7 text-white sm:p-10"><p className="text-sm font-semibold text-[#72ddc9]">Annual</p><p className="mt-5 text-5xl font-semibold tracking-[-0.04em]">{formatKes(annual.amountMinor)}</p><p className="mt-2 text-white/65">per year</p><p className="mt-8 text-base leading-7 text-white/70">The same product access, billed annually at the amount configured in Pharmacy OS.</p><Link href="/register" className="mt-9 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#72ddc9] px-6 text-sm font-semibold text-[#0e2e28] hover:bg-white">Start your trial <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
        </div>

        <div className="mt-16 grid gap-10 border-t border-[#173a33]/15 pt-12 lg:grid-cols-[0.75fr_1.25fr]"><div><h2 className="text-3xl font-semibold tracking-[-0.03em]">Included in both billing options.</h2><p className="mt-4 text-base leading-7 text-[#526a64]">Plans differ by billing interval, not by a reduced feature tier.</p></div><ul className="grid gap-4 sm:grid-cols-2">{included.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#294a43]"><Check className="mt-1 size-4 shrink-0 text-[#008c78]" aria-hidden="true" />{item}</li>)}</ul></div>
      </section>

      <section className="border-y border-[#143e36]/10 bg-white"><div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2"><div><h2 className="text-3xl font-semibold tracking-[-0.03em]">What the published price covers.</h2><p className="mt-5 text-base leading-7 text-[#526a64]">The amounts above are the Pharmacy OS software subscription prices configured in the product. Card payments renew automatically; M-Pesa subscription payments are paid for each billing period.</p></div><div><h2 className="text-3xl font-semibold tracking-[-0.03em]">What to confirm before migrating.</h2><p className="mt-5 text-base leading-7 text-[#526a64]">Data import, hands-on onboarding, hardware compatibility and any additional setup work depend on your starting point. These services are not priced on this page, so confirm the scope before relying on them.</p></div></div></section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8"><h2 className="text-balance text-4xl font-semibold tracking-[-0.04em]">See the workflow before you create your pharmacy.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#526a64]">Open the sample pharmacy to review sales, stock alerts, fast and slow movers, and the role-aware workspace.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/demo" className="inline-flex h-12 items-center justify-center rounded-lg bg-[#006b5d] px-6 text-sm font-semibold text-white hover:bg-[#00594e]">Explore the live demo</Link><Link href="/features/pharmacy-pos" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold ring-1 ring-[#173a33]/15 hover:bg-[#eaf3f0]">Explore pharmacy POS</Link></div></section>
      <MarketingFooter />
    </main>
  );
}
