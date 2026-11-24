import { describe, expect, it } from "vitest";
import { auditCatalogue, type CatalogueAuditProduct } from "../lib/catalogue-audit";

function product(overrides: Partial<CatalogueAuditProduct> = {}): CatalogueAuditProduct {
  return {
    id: "product-1",
    name: "Rice",
    sku: "RICE-1",
    name_hi: "चावल",
    category_id: "category-1",
    subcategory: "Rice",
    brand: "Store brand",
    mrp: 100,
    price: 90,
    quantity: 2,
    unit: "1 kg",
    image_url: "/rice.png",
    description: "Rice pack",
    stock_status: "available",
    ...overrides,
  };
}

describe("auditCatalogue", () => {
  it("finds duplicate SKUs without case or surrounding-space differences", () => {
    const result = auditCatalogue([
      product(),
      product({ id: "product-2", sku: " rice-1 " }),
      product({ id: "product-3", sku: "RICE-2" }),
    ]);

    expect(result.duplicateSkuGroups).toHaveLength(1);
    expect(result.duplicateSkuGroups[0].products.map((item) => item.id)).toEqual([
      "product-1",
      "product-2",
    ]);
  });

  it("reports all missing catalogue fields and treats zero values as present", () => {
    const result = auditCatalogue([
      product({
        sku: null,
        brand: " ",
        mrp: null,
        price: 0,
        quantity: 0,
        image_url: null,
      }),
    ]);

    expect(result.incompleteProducts[0].missingFields).toEqual([
      "SKU",
      "Brand",
      "MRP",
      "Image",
    ]);
  });
});
