import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { featurePages, featureSlugs } from "@/lib/marketing/features";

export function MarketingHeader() {
  return (
    <header className="border-b border-[#143e36]/10 bg-[#f4f8f6] text-[#102521]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="Pharmacy OS home">
          <BrandMark className="size-10 text-[#006b5d]" />
          <span className="font-semibold tracking-[-0.02em]">Pharmacy OS</span>
        </Link>
        <nav aria-label="Public navigation" className="order-3 grid w-full grid-cols-3 gap-x-4 gap-y-2 text-sm font-medium text-[#49635d] lg:order-2 lg:flex lg:w-auto lg:gap-5">
          <Link href="/features/pharmacy-pos" className="hover:text-[#006b5d]">POS</Link>
          <Link href="/features/inventory-management" className="hover:text-[#006b5d]">Inventory</Link>
          <Link href="/features/insurance-management" className="hover:text-[#006b5d]">Insurance</Link>
          <Link href="/features/pharmacy-analytics" className="hover:text-[#006b5d]">Analytics</Link>
          <Link href="/pricing" className="hover:text-[#006b5d]">Pricing</Link>
          <Link href="/demo" className="hover:text-[#006b5d]">Demo</Link>
        </nav>
        <div className="order-2 flex items-center gap-2 lg:order-3">
          <Link href="/login" className="hidden px-3 py-2 text-sm font-semibold text-[#294a43] hover:text-[#006b5d] sm:inline-flex">Sign in</Link>
          <Link href="/register" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#006b5d] px-4 text-sm font-semibold text-white hover:bg-[#00594e]">
            Create pharmacy <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-[#0a241f] text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.3fr_2fr] lg:px-10">
        <div>
          <Link href="/" className="flex items-center gap-3 font-semibold text-white"><BrandMark className="size-9 text-[#006b5d]" />Pharmacy OS</Link>
          <p className="mt-4 max-w-sm text-sm leading-6">Pharmacy management software built for the work between the shelf, the patient, and the business.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div><p className="text-sm font-semibold text-white">Product</p><ul className="mt-4 space-y-2 text-sm">{featureSlugs.slice(0, 3).map((slug) => <li key={slug}><Link className="hover:text-white" href={`/features/${slug}`}>{featurePages[slug].navLabel}</Link></li>)}</ul></div>
          <div><p className="text-sm font-semibold text-white">Workflows</p><ul className="mt-4 space-y-2 text-sm">{featureSlugs.slice(3).map((slug) => <li key={slug}><Link className="hover:text-white" href={`/features/${slug}`}>{featurePages[slug].navLabel}</Link></li>)}</ul></div>
          <div><p className="text-sm font-semibold text-white">Start</p><ul className="mt-4 space-y-2 text-sm"><li><Link className="hover:text-white" href="/pricing">Pricing</Link></li><li><Link className="hover:text-white" href="/demo">Live demo</Link></li><li><Link className="hover:text-white" href="/register">Create pharmacy</Link></li><li><Link className="hover:text-white" href="/login">Sign in</Link></li></ul></div>
        </div>
      </div>
    </footer>
  );
}

export function BreadcrumbJsonLd({ name, path }: { name: string; path: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Pharmacy OS", item: "https://pharmacyos.co.ke" },
      { "@type": "ListItem", position: 2, name, item: `https://pharmacyos.co.ke${path}` },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
