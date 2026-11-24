import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://minisuperstore.example").replace(/\/+$/, "");
  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/register`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
