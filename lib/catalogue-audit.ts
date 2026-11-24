export type CatalogueAuditProduct = {
  id: string;
  name: string;
  sku: string | null;
  name_hi: string | null;
  category_id: string | null;
  subcategory: string | null;
  brand: string | null;
  mrp: number | null;
  price: number | null;
  quantity: number | null;
  unit: string | null;
  image_url: string | null;
  description: string | null;
  stock_status: string | null;
};

export type IncompleteCatalogueProduct = {
  product: CatalogueAuditProduct;
  missingFields: string[];
};

export type DuplicateSkuGroup = {
  sku: string;
  products: CatalogueAuditProduct[];
};

export function auditCatalogue(products: readonly CatalogueAuditProduct[]) {
  const productsBySku = new Map<string, CatalogueAuditProduct[]>();
  const incompleteProducts: IncompleteCatalogueProduct[] = [];

  for (const product of products) {
    const sku = product.sku?.trim();
    if (sku) {
      const normalizedSku = sku.toLocaleLowerCase();
      const group = productsBySku.get(normalizedSku) ?? [];
      group.push(product);
      productsBySku.set(normalizedSku, group);
    }

    const missingFields = [
      ["SKU", product.sku],
      ["Hindi name", product.name_hi],
      ["Category", product.category_id],
      ["Subcategory", product.subcategory],
      ["Brand", product.brand],
      ["MRP", product.mrp],
      ["Selling price", product.price],
      ["Quantity", product.quantity],
      ["Pack size", product.unit],
      ["Image", product.image_url],
      ["Description", product.description],
      ["Availability", product.stock_status],
    ]
      .filter(([, value]) => value === null || (typeof value === "string" && !value.trim()))
      .map(([field]) => field as string);

    if (missingFields.length > 0) {
      incompleteProducts.push({ product, missingFields });
    }
  }

  const duplicateSkuGroups = Array.from(productsBySku.entries())
    .filter(([, group]) => group.length > 1)
    .map(([sku, group]) => ({ sku, products: group }));

  return { duplicateSkuGroups, incompleteProducts };
}
