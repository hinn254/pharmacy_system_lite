import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, BadgeCheck, BarChart3, Boxes, BrainCircuit, Check,
  CircleCheck, FileCheck2, Globe2, ReceiptText, ShieldCheck,
  ShoppingCart, Stethoscope, Users, WalletCards, Activity, Building2, UserRoundCheck,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LandingActivityToast } from "@/components/landing-activity-toast";
import { StartDemoButton } from "@/components/start-demo-button";
import { BrandMark } from "@/components/brand-mark";

// Keep the platform-momentum section ready to re-enable once we want it public.
const SHOW_PLATFORM_MOMENTUM = false;

const title = "Pharmacy Management Software Kenya | Pharmacy OS";
const description =
  "Run pharmacy POS, dispensing, batch inventory, patients, M-Pesa payments, insurance and finance in one connected workspace. Start with Pharmacy OS.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "/",
    siteName: "Pharmacy OS",
    title,
    description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Pharmacy OS — connected pharmacy operations from shelf to patient",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Pharmacy OS",
  url: "https://pharmacyos.co.ke",
  logo: "https://pharmacyos.co.ke/icon",
  description:
    "Pharmacy management software built for Kenyan pharmacies, connecting point of sale, dispensing, batch inventory, patients, insurance, finance, and operational reporting.",
};

const operatingFlow = [
  { number: "01", title: "Sell with the right context", body: "Find the medicine, patient, prescription, and price without bouncing between systems.", icon: ShoppingCart },
  { number: "02", title: "Move the right batch", body: "FEFO allocation helps your team dispense stock by expiry while preserving the audit trail.", icon: Boxes },
  { number: "03", title: "Capture how it was paid", body: "Handle cash, M-Pesa, and insurance in the same checkout flow, with the details each payer needs.", icon: WalletCards },
  { number: "04", title: "See the business change", body: "Stock, sales, finance, and owner reporting stay connected to the transaction that changed them.", icon: BarChart3 },
];

const roleOutcomes = [
  ["Owner", "See sales, stock health, payables, expenses, and the exceptions that need a decision."],
  ["Cashier", "Move through checkout quickly with clear payment and patient context."],
  ["Pharm tech", "Review prescriptions, dispense safely, and keep batch movement traceable."],
  ["Doctor", "Document consultations and send medication orders into the same care workflow."],
] as const;

export default async function Home() {
  const session = await auth();
  let businessesRegistered = 0;
  let teamMembers = 0;
  let activeUsers: { userId: string }[] = [];
  if (SHOW_PLATFORM_MOMENTUM) {
    const now = new Date();
    const activeSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    [businessesRegistered, teamMembers, activeUsers] = await Promise.all([
      prisma.organization.count({ where: { isDemo: false, slug: { not: "main-pharmacy" } } }),
      prisma.user.count({ where: { deletedAt: null, organization: { isDemo: false, slug: { not: "main-pharmacy" } } } }),
      prisma.session.groupBy({ by: ["userId"], where: { updatedAt: { gte: activeSince }, expiresAt: { gt: now }, user: { organization: { isDemo: false, slug: { not: "main-pharmacy" } } } } }),
    ]);
  }
  const primaryHref = session ? "/dashboard" : "/register";
  const primaryLabel = session ? "Open your dashboard" : "Create your pharmacy";

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f8f6] text-[#102521]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <nav className="relative z-30 border-b border-[#143e36]/10 bg-[#f4f8f6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Pharmacy OS home">
            <BrandMark className="size-10 text-[#006b5d] shadow-sm" />
            <span><span className="block text-base font-semibold tracking-[-0.02em]">Pharmacy OS</span><span className="block text-[10px] font-semibold uppercase tracking-[0.19em] text-[#55706a]">Built for the whole pharmacy</span></span>
          </Link>
          <div className="hidden items-center gap-5 text-sm font-medium text-[#49635d] xl:flex">
            <Link href="/features/pharmacy-pos" className="hover:text-[#006b5d]">POS</Link>
            <Link href="/features/inventory-management" className="hover:text-[#006b5d]">Inventory</Link>
            <Link href="/features/insurance-management" className="hover:text-[#006b5d]">Insurance</Link>
            <Link href="/pricing" className="hover:text-[#006b5d]">Pricing</Link>
            <Link href="/demo" className="hover:text-[#006b5d]">Demo</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {!session ? <Link href="/login" className="inline-flex h-10 items-center justify-center px-3 text-sm font-semibold text-[#294a43] transition-colors hover:text-[#006b5d] sm:px-4">Sign in</Link> : null}
            <Link href={primaryHref} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#006b5d] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#00594e] sm:px-5"><span className="hidden sm:inline">{primaryLabel}</span><span className="sm:hidden">{session ? "Dashboard" : "Get started"}</span><ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
        </div>
      </nav>

      <section className="relative border-b border-[#143e36]/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_70%_10%,rgba(66,170,150,0.13),transparent_48%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-24">
          <div className="max-w-2xl">
            <div className="mb-7 flex items-center gap-3 text-sm font-semibold text-[#006b5d]"><span className="h-px w-8 bg-[#006b5d]" />Pharmacy operations, connected end to end</div>
            <h1 className="max-w-xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Pharmacy management software built for Kenyan pharmacies.</h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[#49635d] sm:text-xl">Connect selling, dispensing, stock, patients, insurance, and finance so your team works from one operational truth.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="inline-flex h-13 items-center justify-center gap-2 rounded-lg bg-[#006b5d] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,107,93,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#00594e]">{primaryLabel}<ArrowRight className="size-4" aria-hidden="true" /></Link>
              {!session ? <StartDemoButton /> : null}
            </div>
            {!session ? <p className="mt-3 text-sm text-[#617871]">No signup needed. See sales, stock alerts, and fast and slow movers with realistic sample data.</p> : null}
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#49635d]">
              {["Owner-led setup", "Role-based staff access", "Built around Kenyan workflows"].map((item) => <span key={item} className="flex items-center gap-2"><CircleCheck className="size-4 text-[#008c78]" aria-hidden="true" />{item}</span>)}
            </div>
          </div>

          <div className="relative lg:pl-4">
            <div className="absolute -left-5 top-14 z-10 hidden w-44 -rotate-3 bg-[#ffefbd] p-4 text-[#403715] shadow-[0_12px_34px_rgba(35,50,45,0.18)] lg:block"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">Today’s watch list</p><p className="mt-3 text-3xl font-semibold tracking-tight">4 low</p><p className="mt-1 text-xs leading-5">Reorder before the shelf says it first.</p></div>
            <div className="overflow-hidden rounded-[1.75rem] bg-[#0e2e28] p-2.5 shadow-[0_28px_80px_rgba(22,55,48,0.24)] ring-1 ring-[#0e2e28]/20 sm:p-3">
              <div className="flex items-center justify-between px-3 py-2 text-white/65"><span className="text-xs font-medium">Your pharmacy, at a glance</span><span className="flex gap-1.5" aria-hidden="true"><span className="size-1.5 rounded-full bg-white/20" /><span className="size-1.5 rounded-full bg-white/20" /><span className="size-1.5 rounded-full bg-[#60d5bf]" /></span></div>
              <div className="relative aspect-[1.05/1] overflow-hidden rounded-[1.2rem] bg-white sm:aspect-[1.28/1]"><Image src="/product/dashboard-desktop.jpg" alt="Pharmacy OS desktop dashboard showing sales, low stock, expiry watch, fast movers, and slow movers" fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover object-top" /></div>
            </div>
            <div className="absolute -bottom-7 right-4 hidden w-64 rounded-xl bg-white p-4 shadow-[0_18px_50px_rgba(22,55,48,0.18)] ring-1 ring-[#183d35]/10 sm:block"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#dff4ef] text-[#006b5d]"><BrainCircuit className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold">Ask your pharmacy</p><p className="mt-1 text-xs leading-5 text-[#5c716c]">“Which fast-moving items should I reorder this week?”</p></div></div></div>
          </div>
        </div>
      </section>

      {SHOW_PLATFORM_MOMENTUM ? <section className="border-b border-[#143e36]/10 bg-[#edf5f2]" aria-labelledby="platform-momentum">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.15fr_1.85fr]">
          <div className="flex flex-col justify-center border-[#143e36]/10 px-5 py-10 sm:px-8 lg:border-r lg:px-10 lg:py-12">
            <h2 id="platform-momentum" className="max-w-md text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-3xl">Built in Kenya. Growing one pharmacy at a time.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#526a64]">Live platform activity—not estimates—updated as owners and their teams get to work.</p>
          </div>
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {[
              [Building2, businessesRegistered.toLocaleString("en-KE"), businessesRegistered === 1 ? "pharmacy workspace" : "pharmacy workspaces"],
              [Users, teamMembers.toLocaleString("en-KE"), teamMembers === 1 ? "team member equipped" : "team members equipped"],
              [UserRoundCheck, activeUsers.length.toLocaleString("en-KE"), "active in the last 24 hours"],
              [Activity, "30 days", "to experience the full platform"],
            ].map(([Icon, value, label]) => { const MetricIcon = Icon as typeof Activity; return (
              <div key={label as string} className="border-l border-t border-[#143e36]/10 px-5 py-7 first:border-l-0 sm:px-6 lg:border-t-0 lg:py-10">
                <MetricIcon className="size-5 text-[#008c78]" aria-hidden="true" />
                <dd className="mt-5 text-3xl font-semibold tabular-nums tracking-[-0.03em] text-[#102521]">{value as string}</dd>
                <dt className="mt-2 max-w-[11rem] text-xs font-medium leading-5 text-[#5d756f]">{label as string}</dt>
              </div>
            ); })}
          </dl>
        </div>
      </section> : null}

      <section className="border-b border-[#143e36]/10 bg-[#0e2e28] text-white">
        <div className="mx-auto grid max-w-7xl gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {[["M-Pesa", "From prompt or confirmation to a traceable payment"], ["Insurance", "Scheme pricing, member details, claims, and invoices"], ["eTIMS", "Sales records with compliance status and references"], ["AI insight", "Plain-language answers from pharmacy operations"]].map(([title, body]) => <div key={title} className="bg-[#0e2e28] px-6 py-7 lg:px-8"><p className="text-sm font-semibold text-[#72ddc9]">{title}</p><p className="mt-2 text-sm leading-6 text-white/65">{body}</p></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start"><p className="text-sm font-semibold text-[#006b5d]">One transaction, one connected trail</p><h2 className="mt-4 text-balance text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">The receipt is only the beginning.</h2><p className="mt-5 max-w-md text-lg leading-8 text-[#526a64]">Every sale creates work across the pharmacy. Pharmacy OS carries the context forward so your people do not have to reconstruct it later.</p></div>
          <ol className="border-t border-[#173a33]/15">
            {operatingFlow.map(({ number, title, body, icon: Icon }) => <li key={number} className="grid gap-4 border-b border-[#173a33]/15 py-7 sm:grid-cols-[3rem_3rem_1fr] sm:items-start sm:gap-5 sm:py-9"><span className="font-mono text-xs font-semibold text-[#729088]">{number}</span><span className="flex size-11 items-center justify-center rounded-xl bg-[#dff1ec] text-[#006b5d]"><Icon className="size-5" aria-hidden="true" /></span><div><h3 className="text-xl font-semibold tracking-[-0.025em]">{title}</h3><p className="mt-2 max-w-xl text-base leading-7 text-[#526a64]">{body}</p></div></li>)}
          </ol>
        </div>
      </section>

      <section className="border-y border-[#143e36]/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-semibold text-[#006b5d]">See the work, not just the software</p><h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Built around the decisions a pharmacy makes every day.</h2></div>
          <div className="mt-16 space-y-20 sm:mt-20 sm:space-y-28">
            <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="order-2 lg:order-1"><div className="relative aspect-[1.08/1] overflow-hidden rounded-2xl bg-[#eef5f3] ring-1 ring-[#173a33]/10"><Image src="/product/pos.jpg" alt="Pharmacy OS point of sale with cash, M-Pesa, and insurance payment choices" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-top" /></div></div>
              <div className="order-1 lg:order-2"><span className="flex size-11 items-center justify-center rounded-xl bg-[#dff1ec] text-[#006b5d]"><ShoppingCart className="size-5" aria-hidden="true" /></span><h3 className="mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Sell quickly without losing the clinical detail.</h3><p className="mt-5 text-lg leading-8 text-[#526a64]">Search or scan stock, attach a patient or prescription, apply the right price, and take cash, M-Pesa, or insurance—all while FEFO chooses the appropriate batch.</p><ul className="mt-7 space-y-3 text-sm text-[#294a43]">{["Barcode-ready product search", "Retail and insurance pricing", "Prescription, receipt, and dispensing-label trail"].map((item) => <li key={item} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-[#008c78]" aria-hidden="true" />{item}</li>)}</ul></div>
            </article>
            <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div><span className="flex size-11 items-center justify-center rounded-xl bg-[#fff0c9] text-[#8a5b00]"><Boxes className="size-5" aria-hidden="true" /></span><h3 className="mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Know what is on the shelf—and what needs attention next.</h3><p className="mt-5 text-lg leading-8 text-[#526a64]">Track each batch by supplier, quantity, expiry, and reorder level. Low-stock and expiry signals turn a stock list into a daily action plan.</p><div className="mt-7 max-w-lg border-t border-[#d8b45f]/45 pt-5"><p className="font-semibold">Buying gets easier too.</p><p className="mt-1 text-sm leading-6 text-[#526a64]">Fast- and slow-mover insight helps owners decide what to replenish, what to reduce, and where cash is tied up.</p></div></div>
              <div className="relative aspect-[1.08/1] overflow-hidden rounded-2xl bg-[#eef5f3] ring-1 ring-[#173a33]/10"><Image src="/product/inventory.jpg" alt="Pharmacy OS batch inventory showing expiry dates, low-stock status, and suppliers" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-top" /></div>
            </article>
            <article className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="order-2 lg:order-1"><div className="relative aspect-[1.08/1] overflow-hidden rounded-2xl bg-[#eef5f3] ring-1 ring-[#173a33]/10"><Image src="/product/insurance.jpg" alt="Pharmacy OS insurance invoicing workflow" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover object-top" /></div></div>
              <div className="order-1 lg:order-2"><span className="flex size-11 items-center justify-center rounded-xl bg-[#e7efff] text-[#345c9c]"><FileCheck2 className="size-5" aria-hidden="true" /></span><h3 className="mt-6 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Carry the sale through insurance and compliance.</h3><p className="mt-5 text-lg leading-8 text-[#526a64]">Capture scheme and member details at checkout, group unsettled claims into insurer invoices, and retain eTIMS status and references alongside the transaction.</p><p className="mt-6 flex items-start gap-3 text-sm leading-6 text-[#294a43]"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#006b5d]" aria-hidden="true" />The workflow keeps financial and operational records connected without claiming that paperwork disappears.</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#dff1ec]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
          <div><div className="flex items-center gap-3 text-sm font-semibold text-[#006b5d]"><BrainCircuit className="size-5" aria-hidden="true" />Ask your pharmacy</div><h2 className="mt-5 max-w-xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Your data should answer practical questions.</h2><p className="mt-5 max-w-xl text-lg leading-8 text-[#49635d]">The built-in AI assistant helps turn sales and stock activity into plain-language answers—useful when selling at the counter or deciding what to buy next.</p></div>
          <div className="bg-[#0e2e28] p-5 text-white shadow-[0_24px_60px_rgba(14,46,40,0.18)] sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72ddc9]">A question worth asking</p><p className="mt-4 text-xl font-medium leading-8">“Which medicines sold fastest this month, and which low-stock batches should I reorder first?”</p><div className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-white/65">Answers stay grounded in the pharmacy workspace and the page your team is working on.</div></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div><div className="flex gap-3 text-[#006b5d]"><Globe2 className="size-6" aria-hidden="true" /><BadgeCheck className="size-6" aria-hidden="true" /></div><h2 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Your pharmacy does not stop at the counter.</h2><p className="mt-5 text-lg leading-8 text-[#526a64]">Give customers a polished, client-facing website while your team runs the operational side in Pharmacy OS. Build trust before the visit, make your services easier to discover, and keep the business ready for the next digital workflow.</p></div>
          <div className="grid border-t border-[#173a33]/15 sm:grid-cols-2">
            {[[Globe2, "A credible digital front door", "Present your pharmacy, services, location, and customer information with the same professionalism as the dispensary."], [Users, "One team, clear responsibilities", "Give each role the workspace it needs without exposing every administrative control."], [Stethoscope, "Care and commerce stay connected", "Keep patients, consultations, prescriptions, checkout, and dispensing in a coherent journey."], [ReceiptText, "Records owners can follow", "Trace activity from transaction to stock movement, payer, finance, and reporting."]].map(([Icon, title, body]) => { const FeatureIcon = Icon as typeof Globe2; return <div key={title as string} className="border-b border-[#173a33]/15 py-7 sm:px-7 sm:odd:border-r"><FeatureIcon className="size-5 text-[#006b5d]" aria-hidden="true" /><h3 className="mt-4 font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#526a64]">{body as string}</p></div>; })}
          </div>
        </div>
      </section>

      <section className="border-y border-[#143e36]/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
          <div className="max-w-2xl"><p className="text-sm font-semibold text-[#006b5d]">One system, different jobs</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">Everyone sees the work that matters to them.</h2></div>
          <div className="mt-12 grid border-y border-[#173a33]/15 sm:grid-cols-2 lg:grid-cols-4">
            {roleOutcomes.map(([role, outcome]) => <div key={role} className="border-b border-[#173a33]/15 py-7 sm:px-6 sm:odd:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"><p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-[#006b5d]">{role}</p><p className="mt-4 text-sm leading-6 text-[#405b55]">{outcome}</p></div>)}
          </div>
        </div>
      </section>

      <section className="bg-[#0e2e28] text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-20 text-center sm:px-8 sm:py-28"><BrandMark className="size-11 text-[#006b5d] ring-1 ring-white/10" /><h2 className="mt-7 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Start with your pharmacy. Bring the whole operation with you.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">Create the owner account, open your workspace, and shape the setup around the way your team works.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href={primaryHref} className="inline-flex h-13 items-center justify-center gap-2 rounded-lg bg-[#72ddc9] px-7 text-sm font-semibold text-[#0e2e28] transition-colors hover:bg-white">{primaryLabel}<ArrowRight className="size-4" aria-hidden="true" /></Link>{!session ? <Link href="/login" className="inline-flex h-13 items-center justify-center rounded-lg px-7 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10">Sign in</Link> : null}</div></div>
      </section>

      <footer className="bg-[#0a241f] text-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10"><div className="flex items-center gap-2 font-semibold text-white"><BrandMark className="size-5 text-[#006b5d]" />Pharmacy OS</div><p>Built for the work between the shelf, the patient, and the business.</p><div className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/features/pharmacy-pos" className="hover:text-white">POS</Link><Link href="/features/inventory-management" className="hover:text-white">Inventory</Link><Link href="/pricing" className="hover:text-white">Pricing</Link><Link href="/demo" className="hover:text-white">Demo</Link><Link href="/login" className="hover:text-white">Sign in</Link><Link href="/register" className="hover:text-white">Create pharmacy</Link></div></div>
      </footer>
      <LandingActivityToast />
    </main>
  );
}
