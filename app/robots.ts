import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://minisuperstore.example").replace(/\/+$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/staff", "/dashboard", "/auth/"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
