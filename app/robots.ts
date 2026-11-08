import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/billing/",
        "/clear-session/",
        "/dashboard/",
        "/admin/",
        "/clients/",
        "/consultations/",
        "/doctor/",
        "/inventory/",
        "/patients/",
        "/pos/",
      ],
    },
    sitemap: "https://pharmacyos.co.ke/sitemap.xml",
    host: "https://pharmacyos.co.ke",
  };
}
