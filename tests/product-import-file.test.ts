import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { readProductImportFile } from "../lib/product-import-file";

describe("product import file reader", () => {
  it("reads product rows from the Products worksheet in an XLSX workbook", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Instructions").addRow(["Not a product"]);
    const products = workbook.addWorksheet("Products");
    products.addRow(["SKU", "Product_Name", "Selling_Price"]);
    products.addRow(["RICE-01", "Basmati Rice", "125.50"]);
    const content = await workbook.xlsx.writeBuffer();
    const file = new File([new Uint8Array(content)], "catalogue.xlsx");

    await expect(readProductImportFile(file)).resolves.toMatchObject([
      {
        rowNumber: 2,
        payload: { sku: "RICE-01", name: "Basmati Rice", price: 125.5 },
      },
    ]);
  });
});
