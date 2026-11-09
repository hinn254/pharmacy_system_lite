import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturePage } from "@/components/marketing/feature-page";
import { featurePages, featureSlugs, type FeatureSlug } from "@/lib/marketing/features";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return featureSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = featurePages[slug as FeatureSlug];
  if (!page) return {};
  const url = `/features/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, type: "website", images: ["/opengraph-image"] },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: ["/opengraph-image"] },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = featurePages[slug as FeatureSlug];
  if (!page) notFound();
  return <FeaturePage page={page} />;
}
