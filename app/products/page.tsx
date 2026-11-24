import type { Metadata } from "next";
import Storefront from "@/components/store/Storefront";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_CATEGORIES, DEFAULT_PRODUCTS } from "@/lib/catalogue-data";
import type { PublicCategory, PublicProduct, PublicOffer } from "@/app/page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Products Catalogue | Mini Super Store",
  description: "Browse 580+ grocery items: Atta, Dals, Rice, Haldiram's Namkeen, Biscuits, MDH Masala, Pure Mustard Oils & Home Essentials in Ladwa.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage() {
  let categories: PublicCategory[] = [];
  let products: PublicProduct[] = [];
  let offers: PublicOffer[] = [];

  const supabase = createPublicClient();

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

      if (!categoryResult.error && categoryResult.data) {
        categories = categoryResult.data as PublicCategory[];
      }
      if (!productResult.error && productResult.data) {
        const catMap = new Map(categories.map((c) => [c.id, c]));
        products = productResult.data.map((product) => {
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
            price: product.price === null ? null : Number(product.price),
            mrp: product.mrp === null ? null : Number(product.mrp),
            stock_status: product.stock_status,
            image_url: product.image_url ?? null,
            category_slug: cat?.slug ?? null,
            category_name: cat?.name ?? null,
          };
        }) as PublicProduct[];
      }
      if (!offerResult.error && offerResult.data) {
        offers = offerResult.data as PublicOffer[];
      }
    } catch (err) {
      console.warn("[products] Using verified catalogue fallback:", err);
    }
  }

  if (categories.length === 0) {
    categories = DEFAULT_CATEGORIES as PublicCategory[];
  }
  if (products.length === 0) {
    products = DEFAULT_PRODUCTS as unknown as PublicProduct[];
  }

  return (
    <div className="dedicated-products-page">
      <Storefront
        categories={categories}
        products={products}
        offers={offers}
      />
    </div>
  );
}
