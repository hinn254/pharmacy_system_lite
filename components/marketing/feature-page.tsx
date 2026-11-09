import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, CircleCheck } from "lucide-react";
import { FeaturePage as FeaturePageData, featurePages } from "@/lib/marketing/features";
import { BreadcrumbJsonLd, MarketingFooter, MarketingHeader } from "./marketing-shell";

const cropClasses = {
  pos: "origin-left object-cover object-[center_38%] scale-[1.16]",
  insurance: "origin-left object-contain object-[center_58%] scale-[1.2]",
  "analytics-report": "object-contain object-top scale-[1.18] origin-top-left",
  "analytics-dashboard": "object-cover object-[center_28%] scale-[1.14]",
} as const;

export function FeaturePage({ page }: { page: FeaturePageData }) {
  return (
    <main className="min-h-screen bg-[#f4f8f6] text-[#102521]">
      <BreadcrumbJsonLd name={page.navLabel} path={`/features/${page.slug}`} />
      <MarketingHeader />
      <section className="border-b border-[#143e36]/10">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:px-10 lg:py-24">
          <div>
            <nav aria-label="Breadcrumb" className="text-sm text-[#617871]"><Link href="/" className="hover:text-[#006b5d]">Home</Link><span aria-hidden="true"> / </span><span>{page.navLabel}</span></nav>
            <h1 className="mt-7 max-w-2xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">{page.h1}</h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-[#49635d]">{page.intro}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#006b5d] px-6 text-sm font-semibold text-white hover:bg-[#00594e]">Create your pharmacy <ArrowRight className="size-4" aria-hidden="true" /></Link><Link href="/demo" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-[#173a33] ring-1 ring-[#173a33]/15 hover:bg-[#eaf3f0]">See the sample pharmacy</Link></div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-[#0e2e28] p-2.5 shadow-[0_28px_80px_rgba(22,55,48,0.22)]">
            {page.secondaryImage ? (
              <div className="relative aspect-[1.16/1] overflow-hidden rounded-xl bg-[#dce9e5]">
                <div className="absolute -right-[5%] top-[7%] h-[58%] w-[78%] overflow-hidden rounded-xl bg-white shadow-[0_18px_45px_rgba(14,46,40,0.18)] ring-1 ring-[#173a33]/10">
                  <Image src={page.secondaryImage} alt={page.secondaryImageAlt ?? ""} fill priority sizes="(max-width: 1024px) 82vw, 44vw" className={page.secondaryImageCrop ? cropClasses[page.secondaryImageCrop] : "object-cover object-top"} />
                </div>
                <div className="absolute -bottom-[4%] left-[4%] h-[78%] w-[64%] overflow-hidden rounded-xl bg-white shadow-[0_22px_55px_rgba(14,46,40,0.24)] ring-1 ring-[#173a33]/10">
                  <Image src={page.image} alt={page.imageAlt} fill priority sizes="(max-width: 1024px) 68vw, 36vw" className={page.imageCrop ? cropClasses[page.imageCrop] : page.imageFit === "contain" ? "object-contain object-top" : "object-cover object-top"} />
                </div>
              </div>
            ) : (
              <div className={`relative overflow-hidden rounded-xl bg-white ${page.imageAspect === "wide" ? "aspect-[1.4/1]" : "aspect-[1.16/1]"}`}><Image src={page.image} alt={page.imageAlt} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className={page.imageCrop ? cropClasses[page.imageCrop] : page.imageFit === "contain" ? "object-contain object-center" : "object-cover object-top"} /></div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-[#143e36]/10 bg-[#0e2e28] text-white" aria-label="Capability summary">
        <ul className="mx-auto grid max-w-7xl sm:grid-cols-2 lg:grid-cols-4">{page.proof.map((item) => <li key={item} className="flex items-center gap-3 border-b border-white/10 px-5 py-5 text-sm font-medium sm:px-8 lg:border-b-0 lg:border-r lg:last:border-r-0"><CircleCheck className="size-4 shrink-0 text-[#72ddc9]" aria-hidden="true" />{item}</li>)}</ul>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
        <div className="space-y-20 sm:space-y-24">{page.sections.map((section) => <article key={section.title} className="grid gap-8 border-t border-[#173a33]/15 pt-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20"><h2 className="max-w-xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{section.title}</h2><div><p className="max-w-2xl text-lg leading-8 text-[#526a64]">{section.body}</p><ul className="mt-7 grid gap-3 sm:grid-cols-2">{section.points.map((point) => <li key={point} className="flex items-start gap-3 text-sm leading-6 text-[#294a43]"><Check className="mt-1 size-4 shrink-0 text-[#008c78]" aria-hidden="true" />{point}</li>)}</ul></div></article>)}</div>
      </section>

      <section className="border-y border-[#143e36]/10 bg-white"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:py-20"><h2 className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{page.decisionTitle}</h2><p className="text-lg leading-8 text-[#526a64]">{page.decisionBody}</p></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10"><h2 className="text-3xl font-semibold tracking-[-0.03em]">Follow the connected workflow.</h2><div className="mt-10 grid border-y border-[#173a33]/15 md:grid-cols-3">{page.related.map((slug) => { const related = featurePages[slug]; return <Link key={slug} href={`/features/${slug}`} className="group border-b border-[#173a33]/15 py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0"><p className="text-sm font-semibold text-[#006b5d]">{related.navLabel}</p><p className="mt-3 text-lg font-semibold leading-7 group-hover:text-[#006b5d]">{related.h1}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">Explore {related.navLabel.toLowerCase()} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span></Link>; })}</div><div className="mt-12 flex flex-wrap gap-4"><Link href="/guides/pharmacy-software-vs-generic-pos" className="text-sm font-semibold text-[#006b5d] underline decoration-[#006b5d]/25 underline-offset-4 hover:decoration-current">Read the pharmacy software comparison guide</Link><Link href="/pricing" className="text-sm font-semibold text-[#006b5d] underline decoration-[#006b5d]/25 underline-offset-4 hover:decoration-current">Compare Pharmacy OS pricing</Link><Link href="/demo" className="text-sm font-semibold text-[#006b5d] underline decoration-[#006b5d]/25 underline-offset-4 hover:decoration-current">Try the live sample pharmacy</Link></div></section>
      <MarketingFooter />
    </main>
  );
}
