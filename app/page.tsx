import type { Metadata } from "next";
import Storefront from "@/components/store/Storefront";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  name_hi: string | null;
  description: string | null;
  description_hi: string | null;
};

export type PublicProduct = {
  id: string;
  category_id: string | null;
  name: string;
  name_hi: string | null;
  description: string | null;
  description_hi: string | null;
  price: number | null;
  stock_status: "available" | "limited" | "out_of_stock";
  image_url: string | null;
};

export type PublicOffer = {
  id: string;
  title: string;
  title_hi: string | null;
  description: string | null;
  description_hi: string | null;
};

function StoreStructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "GroceryStore",
    name: "Mini Super Store",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ladwa",
      addressRegion: "Haryana",
      addressCountry: "IN",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function HomePage() {
  let categories: PublicCategory[] = [];
  let products: PublicProduct[] = [];
  let offers: PublicOffer[] = [];

  const supabase = createPublicClient();
  let supabaseError: string | null = null;

  if (supabase) {
    try {
      const [categoryResult, productResult, offerResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, slug, name, name_hi, description, description_hi")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("products")
          .select("id, category_id, name, name_hi, description, description_hi, price, stock_status, image_url")
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("offers")
          .select("id, title, title_hi, description, description_hi")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (categoryResult.error) throw categoryResult.error;
      if (productResult.error) throw productResult.error;
      categories = (categoryResult.data ?? []) as PublicCategory[];
      products = (productResult.data ?? []).map((product) => ({
        ...product,
        price: product.price === null ? null : Number(product.price),
      })) as PublicProduct[];

      // Offers are optional until the offers migration is applied; their failure
      // must never hide a working public product catalogue. The public-read RLS
      // policy applies starts_at / ends_at using PostgreSQL now(), avoiding impure
      // render-time clock reads and client/server clock differences.
      offers = (offerResult.data ?? []) as PublicOffer[];
    } catch (err) {
      // Distinguish "not configured" from a real Supabase error.
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("Supabase is not configured")) {
        supabaseError = null; // let the page render empty; login/orders will also warn
      } else {
        supabaseError = msg;
      }
      categories = [];
      products = [];
      offers = [];
    }
  } else {
    supabaseError = "Supabase is not configured. Copy .env.example to .env.local and add your Supabase Project URL and Publishable key.";
  }

  return (
    <>
      <Storefront
        categories={categories}
        products={products}
        offers={offers}
        supabaseError={supabaseError as string}
      />
      <StoreStructuredData />
    </>
  );
}
