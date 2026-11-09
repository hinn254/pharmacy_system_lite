import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BreadcrumbJsonLd, MarketingFooter, MarketingHeader } from "@/components/marketing/marketing-shell";

const title = "Pharmacy Software vs Generic POS in Kenya";
const description = "Compare pharmacy management software with a generic retail POS across batches, expiry, dispensing, patients, insurance, M-Pesa and pharmacy reporting.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guides/pharmacy-software-vs-generic-pos" },
  openGraph: { title, description, url: "/guides/pharmacy-software-vs-generic-pos", type: "article", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
};

const questions = [
  ["Can it explain stock by batch and expiry?", "A retail POS usually answers how many units remain. A pharmacy system should also retain the batch, expiry date, supplier, movement and FEFO decision behind that quantity."],
  ["What happens between payment and dispensing?", "Look for a connected prescription, cashier, receipt, dispensing-label and medicine-preparation trail rather than a sale that ends when the till opens."],
  ["Can it keep payer details with the transaction?", "Cash, M-Pesa and insurance create different follow-up needs. Check how payment references, member details, claim status and insurer invoices remain connected."],
  ["Does it understand patients and consultations?", "A pharmacy-specific workspace can carry patient, prescription, consultation and medication-order context while still separating access by staff role."],
  ["Will reports trace back to operational records?", "A useful dashboard should lead back to the sales, stock movements, payments, expenses and supplier records that produced the number."],
  ["Which claims are verified?", "Ask vendors to distinguish live capabilities from planned integrations, certifications or compliance claims. Do not treat a field labelled eTIMS as proof of regulatory approval."],
] as const;

export default function ComparisonGuidePage() {
  return <main className="min-h-screen bg-[#f4f8f6] text-[#102521]"><BreadcrumbJsonLd name="Pharmacy software vs generic POS" path="/guides/pharmacy-software-vs-generic-pos" /><MarketingHeader /><article><header className="border-b border-[#143e36]/10"><div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24"><nav aria-label="Breadcrumb" className="text-sm text-[#617871]"><Link href="/" className="hover:text-[#006b5d]">Home</Link><span aria-hidden="true"> / </span><span>Guides</span></nav><h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">Pharmacy software or a generic POS? Compare the work after checkout.</h1><p className="mt-7 max-w-3xl text-pretty text-lg leading-8 text-[#526a64]">A generic retail till can calculate a total. A pharmacy operation must also control batches, expiry, prescriptions, dispensing, patients and different payers. Use these questions when comparing systems in Kenya.</p></div></header><section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24"><div className="space-y-14">{questions.map(([heading, body]) => <section key={heading} className="grid gap-5 border-t border-[#173a33]/15 pt-8 sm:grid-cols-[2rem_1fr]"><Check className="mt-1 size-5 text-[#008c78]" aria-hidden="true" /><div><h2 className="text-2xl font-semibold tracking-[-0.025em]">{heading}</h2><p className="mt-4 text-base leading-8 text-[#526a64]">{body}</p></div></section>)}</div><aside className="mt-20 bg-[#0e2e28] px-6 py-10 text-white sm:px-10"><h2 className="text-3xl font-semibold tracking-[-0.03em]">Compare one real pharmacy workflow.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-white/70">Follow a medicine from batch inventory through checkout, payment and reporting in the Pharmacy OS sample workspace.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href="/demo" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#72ddc9] px-6 text-sm font-semibold text-[#0e2e28] hover:bg-white">Open the live demo <ArrowRight className="size-4" aria-hidden="true" /></Link><Link href="/features/pharmacy-pos" className="inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold ring-1 ring-white/25 hover:bg-white/10">Explore pharmacy POS</Link></div></aside></section></article><MarketingFooter /></main>;
}
