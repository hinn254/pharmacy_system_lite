import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { featurePages, featureSlugs } from "@/lib/marketing/features";
import { PublicHeader } from "./public-header";

export function MarketingHeader() {
  return <PublicHeader />;
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
