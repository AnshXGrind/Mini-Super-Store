import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (!siteUrl) return [];

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/register`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
