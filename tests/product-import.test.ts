import { describe, expect, it } from "vitest";
import { parseProductImportRows } from "../lib/product-import";

describe("product import row parsing", () => {
  it("maps the catalogue workbook headings and optional product fields", () => {
    const [product] = parseProductImportRows([
      {
        rowNumber: 1,
        values: [
          "SKU", "Product_Name", "Company / Brand", "Category", "Sub_Category",
          "Pack_Size", "MRP", "Selling_Price", "Quantity", "Product Image URL",
          "Barcode", "Description", "Is_Active",
        ],
      },
      {
        rowNumber: 2,
        values: [
          "GROC-01", "Wheat Atta", "Mill Co.", "Staples", "Flour", "1 kg",
          "80.00", "72.50", "12", "https://images.example/atta.png",
          "12345", "Whole wheat flour", "YES",
        ],
      },
    ]);

    expect(product).toMatchObject({
      rowNumber: 2,
      payload: {
        sku: "GROC-01",
        name: "Wheat Atta",
        brand: "Mill Co.",
        category: "Staples",
        subcategory: "Flour",
        unit: "1 kg",
        mrp: 80,
        price: 72.5,
        quantity: 12,
        image_url: "https://images.example/atta.png",
        barcode: "12345",
        description: "Whole wheat flour",
        is_published: true,
      },
    });
    expect(product.validationError).toBeUndefined();
  });

  it("matches an existing product by Product ID and keeps a filename image unchanged", () => {
    const [product] = parseProductImportRows([
      { rowNumber: 1, values: ["Product ID", "Product Name", "Image_File"] },
      { rowNumber: 7, values: ["vendor-42", "Dish soap", "dish-soap.png"] },
    ]);

    expect(product.payload).toMatchObject({ external_id: "vendor-42", name: "Dish soap" });
    expect(product.payload).not.toHaveProperty("image_url");
    expect(product.warning).toContain("existing image will be kept");
  });

  it("reports row-numbered validation failures and skips duplicate identifiers", () => {
    const rows = parseProductImportRows([
      { rowNumber: 1, values: ["SKU", "Product Name", "MRP", "Selling Price"] },
      { rowNumber: 2, values: ["A-1", "Tea", "10", "8"] },
      { rowNumber: 3, values: ["a-1", "Tea duplicate", "20", "15"] },
      { rowNumber: 4, values: ["B-1", "Coffee", "10", "12"] },
    ]);

    expect(rows[0].validationError).toBeUndefined();
    expect(rows[1].skipReason).toContain("Row 3");
    expect(rows[2].validationError).toContain("Row 4");
    expect(rows[2].validationError).toContain("Selling Price cannot be greater than MRP");
  });

  it("matches an ambiguous Product ID / SKU column without overwriting existing identifiers", () => {
    const [product] = parseProductImportRows([
      { rowNumber: 1, values: ["Product ID / SKU", "Product Name"] },
      { rowNumber: 2, values: ["ITEM-7", "Rice"] },
    ]);

    expect(product.payload).toMatchObject({
      identifier: "ITEM-7",
      name: "Rice",
    });
  });
});
