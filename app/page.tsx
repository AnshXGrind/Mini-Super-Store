import type { Metadata } from "next";
import Storefront from "@/components/store/Storefront";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from "@/lib/catalogue-data";

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
  sku?: string | null;
  name: string;
  name_hi: string | null;
  brand?: string | null;
  subcategory?: string | null;
  pack_size?: string | null;
  description: string | null;
  description_hi: string | null;
  price: number | null;
  mrp?: number | null;
  stock_status: "available" | "limited" | "out_of_stock";
  image_url: string | null;
  category_slug?: string | null;
  category_name?: string | null;
};

export type PublicOffer = {
  id: string;
  title: string;
  title_hi: string | null;
  description: string | null;
  description_hi: string | null;
};

export type PublicSeasonalCollection = {
  id: string;
  title: string;
  title_hi: string | null;
  description: string | null;
  description_hi: string | null;
  product_ids: string[];
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
  let seasonalCollections: PublicSeasonalCollection[] = [];

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
          .select("id, category_id, sku, name, name_hi, brand, subcategory, unit, mrp, description, description_hi, price, stock_status, image_url")
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

      const catMap = new Map(categories.map((c) => [c.id, c]));
      products = (productResult.data ?? []).map((product) => {
        const cat = product.category_id ? catMap.get(product.category_id) : undefined;
        return {
          id: product.id,
          category_id: product.category_id,
          sku: product.sku ?? null,
          name: product.name,
          name_hi: product.name_hi ?? null,
          brand: product.brand ?? null,
          subcategory: product.subcategory ?? null,
          pack_size: product.unit ?? null,
          description: product.description ?? null,
          description_hi: product.description_hi ?? null,
          //price: product.price === null ? null : Number(product.price),
          mrp: product.mrp === null ? null : Number(product.mrp),
          stock_status: product.stock_status,
          image_url: product.image_url ?? null,
          category_slug: cat?.slug ?? null,
          category_name: cat?.name ?? null,
        };
      }) as PublicProduct[];

      offers = (offerResult.data ?? []) as PublicOffer[];
    } catch (err) {
      console.warn("[catalogue] Database catalogue could not be loaded; using local catalogue fallback:", err);
    }

    try {
      const [collectionResult, productLinksResult] = await Promise.all([
        supabase
          .from("seasonal_collections")
          .select("id, title, title_hi, description, description_hi")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("seasonal_collection_products")
          .select("collection_id, product_id"),
      ]);
      if (collectionResult.error) throw collectionResult.error;
      if (productLinksResult.error) throw productLinksResult.error;

      const productIdsByCollection = new Map<string, string[]>();
      for (const link of productLinksResult.data ?? []) {
        const productIds = productIdsByCollection.get(link.collection_id) ?? [];
        productIds.push(link.product_id);
        productIdsByCollection.set(link.collection_id, productIds);
      }
      seasonalCollections = (collectionResult.data ?? [])
        .map((collection) => ({
          ...collection,
          product_ids: productIdsByCollection.get(collection.id) ?? [],
        }))
        .filter((collection) => collection.product_ids.length > 0) as PublicSeasonalCollection[];
    } catch (err) {
      console.warn("[seasonal] Active collections could not be loaded:", err);
    }
  }

  // Resilient catalogue fallback ensures all categories and products
  // render immediately and smoothly for all shoppers.
  if (categories.length === 0) {
    categories = DEFAULT_CATEGORIES as PublicCategory[];
  }
  if (products.length === 0) {
    products = DEFAULT_PRODUCTS as unknown as PublicProduct[];
  }

  return (
    <>
      <Storefront
        categories={categories}
        products={products}
        offers={offers}
        seasonalCollections={seasonalCollections}
      />
      <StoreStructuredData />
    </>
  );
}
