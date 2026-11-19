import Storefront from "@/components/store/Storefront";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let categories: PublicCategory[] = [];
  let products: PublicProduct[] = [];

  if (!url || !key) {
    return <Storefront categories={categories} products={products} />;
  }

  try {
    const supabase = await createClient();
    const [categoryResult, productResult] = await Promise.all([
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
    ]);
    categories = (categoryResult.data ?? []) as PublicCategory[];
    products = (productResult.data ?? []).map((product) => ({
      ...product,
      price: product.price === null ? null : Number(product.price),
    })) as PublicProduct[];
  } catch {
    categories = [];
    products = [];
  }

  return (
    <>
      <Storefront categories={categories} products={products} />
      <StoreStructuredData />
    </>
  );
}
