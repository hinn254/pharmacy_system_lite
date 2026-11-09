import type { MetadataRoute } from "next";
import { featureSlugs } from "@/lib/marketing/features";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-11-08");
  return [
    {
      url: "https://pharmacyos.co.ke",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: ["https://pharmacyos.co.ke/product/dashboard-desktop.jpg"],
    },
    ...featureSlugs.map((slug) => ({
      url: `https://pharmacyos.co.ke/features/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: "https://pharmacyos.co.ke/pricing",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: "https://pharmacyos.co.ke/demo",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
      images: ["https://pharmacyos.co.ke/product/dashboard-desktop.jpg"],
    },
    {
      url: "https://pharmacyos.co.ke/guides/pharmacy-software-vs-generic-pos",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
