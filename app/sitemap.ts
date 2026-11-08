import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://pharmacyos.co.ke",
      lastModified: new Date("2026-11-07"),
      changeFrequency: "weekly",
      priority: 1,
      images: ["https://pharmacyos.co.ke/product/dashboard-desktop.jpg"],
    },
  ];
}
