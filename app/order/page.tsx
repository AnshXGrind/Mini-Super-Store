import type { Metadata } from "next";
import Storefront from "@/components/store/Storefront";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from "@/lib/catalogue-data";
import type { PublicCategory, PublicProduct } from "@/app/page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Order Online | Mini Super Store",
  description:
    "Browse groceries and household essentials from Mini Super Store in Ladwa, add items to your cart, and send your order on WhatsApp.",
  alternates: { canonical: "/order" },
};

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  let categories: PublicCategory[] = [];
  let products: PublicProduct[] = [];

  const supabase = createPublicClient();

  if (supabase) {
    try {
      const [categoryResult, productResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, slug, name, name_hi, description, description_hi")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("products")
          .select("id, category_id, sku, name, name_hi, brand, subcategory, unit, description, description_hi, stock_status, image_url")
          .eq("is_published", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (categoryResult.error) throw categoryResult.error;
      if (productResult.error) throw productResult.error;

      categories = (categoryResult.data ?? []) as PublicCategory[];
      const categoryById = new Map(categories.map((category) => [category.id, category]));
      products = (productResult.data ?? []).map((product) => {
        const category = product.category_id
          ? categoryById.get(product.category_id)
          : undefined;

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
          price: null,
          stock_status: product.stock_status,
          image_url: product.image_url ?? null,
          category_slug: category?.slug ?? null,
          category_name: category?.name ?? null,
        };
      }) as PublicProduct[];
    } catch (error) {
      console.warn("[order] Using verified offline catalogue fallback:", error);
    }
  }

  if (categories.length === 0) {
    categories = DEFAULT_CATEGORIES as PublicCategory[];
  }
  if (products.length === 0) {
    products = DEFAULT_PRODUCTS as unknown as PublicProduct[];
  }
  const { category: requestedCategory } = await searchParams;
  const initialCategory = categories.some(
    (category) => category.slug === requestedCategory,
  )
    ? requestedCategory ?? "all"
    : "all";

  return (
    <Storefront
      categories={categories}
      products={products}
      offers={[]}
      mode="order"
      initialCategory={initialCategory}
    />
  );
}
