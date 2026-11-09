import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock3, Database, ShieldCheck } from "lucide-react";
import { StartDemoButton } from "@/components/start-demo-button";
import { DemoRolePicker } from "@/components/demo-role-picker";
import { BreadcrumbJsonLd, MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";

const title = "Pharmacy Software Demo Kenya";
const description = "Try a live Pharmacy OS sample pharmacy with realistic sales, batch inventory, expiry alerts, payments and reporting. No signup is required.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/demo" },
  openGraph: { title, description, url: "/demo", type: "website", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
};

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#f4f8f6] text-[#102521]">
      <BreadcrumbJsonLd name="Demo" path="/demo" />
      <MarketingHeader />
      <section className="border-b border-[#143e36]/10"><div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:px-10 lg:py-24"><div><nav aria-label="Breadcrumb" className="text-sm text-[#617871]"><Link href="/" className="hover:text-[#006b5d]">Home</Link><span aria-hidden="true"> / </span><span>Demo</span></nav><h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">Walk through a working sample pharmacy.</h1><p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[#526a64]">Open a pre-seeded Pharmacy OS workspace with realistic sales, medicines, batches, patients and finance records. No registration is required.</p><div className="mt-9"><StartDemoButton /></div><p className="mt-4 text-sm leading-6 text-[#617871]">The demo uses shared sample data and may reset between visits. Do not enter real patient or business information.</p></div><div className="overflow-hidden rounded-2xl bg-[#0e2e28] p-2.5 shadow-[0_28px_80px_rgba(22,55,48,0.22)]"><div className="relative aspect-[1.2/1] overflow-hidden rounded-xl bg-white"><Image src="/product/dashboard-desktop.jpg" alt="Pharmacy OS sample dashboard with sales, stock alerts, expiry watch, fast movers and slow movers" fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover object-top" /></div></div></div></section>

      <section className="border-b border-[#143e36]/10 bg-[#edf5f2]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div><h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Choose a workspace view.</h2></div>
            <div className="max-w-2xl"><p className="text-base leading-7 text-[#526a64]">See the same sample pharmacy through each team member’s navigation and permissions. We’ll prepare the demo credentials for you.</p><p className="mt-2 text-sm font-medium text-[#006b5d]">Return to this page whenever you want to switch roles.</p></div>
          </div>
          <div className="mt-10"><DemoRolePicker /></div>
        </div>
      </section>

      <section className="border-b border-[#143e36]/10 bg-[#0e2e28] text-white"><div className="mx-auto grid max-w-7xl sm:grid-cols-3"><div className="border-b border-white/10 px-6 py-8 sm:border-b-0 sm:border-r"><Clock3 className="size-5 text-[#72ddc9]" aria-hidden="true" /><h2 className="mt-5 font-semibold">Credentials ready</h2><p className="mt-2 text-sm leading-6 text-white/65">Choose a role, then press Sign in with the prepared demo account.</p></div><div className="border-b border-white/10 px-6 py-8 sm:border-b-0 sm:border-r"><Database className="size-5 text-[#72ddc9]" aria-hidden="true" /><h2 className="mt-5 font-semibold">Realistic sample records</h2><p className="mt-2 text-sm leading-6 text-white/65">Explore connected transactions without using live pharmacy data.</p></div><div className="px-6 py-8"><ShieldCheck className="size-5 text-[#72ddc9]" aria-hidden="true" /><h2 className="mt-5 font-semibold">External charges disabled</h2><p className="mt-2 text-sm leading-6 text-white/65">Demo safeguards reject subscription checkout and M-Pesa STK initiation.</p></div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10"><div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20"><div><h2 className="text-balance text-4xl font-semibold tracking-[-0.04em]">A useful route through the demo.</h2><p className="mt-5 text-lg leading-8 text-[#526a64]">Start with the owner dashboard, then follow one medicine from stock to sale and reporting.</p></div><ol className="border-t border-[#173a33]/15">{[["Review the dashboard", "See today’s sales, low-stock items, expiry watch, and fast and slow movers."], ["Open inventory", "Inspect medicines, batch quantities, expiry dates, suppliers and reorder signals."], ["Build a sale", "Search stock and review the cash, M-Pesa and insurance checkout choices."], ["Follow the record", "Look at receipts, stock movement, finance and reporting after the transaction."]].map(([heading, body]) => <li key={heading} className="grid gap-4 border-b border-[#173a33]/15 py-7 sm:grid-cols-[2rem_1fr]"><Check className="mt-1 size-5 text-[#008c78]" aria-hidden="true" /><div><h3 className="text-lg font-semibold">{heading}</h3><p className="mt-2 text-base leading-7 text-[#526a64]">{body}</p></div></li>)}</ol></div></section>

      <section className="border-y border-[#143e36]/10 bg-white"><div className="mx-auto max-w-5xl px-5 py-16 text-center sm:px-8"><h2 className="text-balance text-4xl font-semibold tracking-[-0.04em]">Ready to work with your own pharmacy data?</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#526a64]">Create an owner account and start a separate pharmacy workspace for your team.</p><Link href="/register" className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-[#006b5d] px-7 text-sm font-semibold text-white hover:bg-[#00594e]">Create your pharmacy</Link></div></section>
      <MarketingFooter />
    </main>
  );
}
