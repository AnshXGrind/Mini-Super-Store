import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { PassThrough, Readable } from "node:stream";
import { getCurrentStoreUserResult } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const pageSize = 1000;

export async function GET() {
  const result = await getCurrentStoreUserResult();
  if (result.status === "unavailable") {
    return NextResponse.json({ error: "Authentication service is unavailable." }, { status: 503 });
  }
  if (result.status !== "authenticated" || result.user.role !== "admin") {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const supabase = await createClient();
  const output = new PassThrough();
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: output,
    useStyles: false,
    useSharedStrings: false,
  });
  const worksheet = workbook.addWorksheet("Products");
  worksheet.addRow([
    "Product ID",
    "SKU",
    "Product Name",
    "Category",
    "Subcategory",
    "Company / Brand",
    "MRP",
    "Selling Price",
    "Quantity",
    "Unit (pack)",
    "Product Image URL",
    "Barcode",
    "Description",
    "Is Active",
  ]).commit();

  void (async () => {
    try {
      let lastId: string | null = null;
      while (true) {
        let productsQuery = supabase
          .from("products")
          .select("external_id, sku, name, category:categories(name), subcategory, brand, mrp, price, quantity, unit, image_url, barcode, description, is_published, id");
        if (lastId) productsQuery = productsQuery.gt("id", lastId);
        const { data, error } = await productsQuery
          .order("id", { ascending: true })
          .limit(pageSize);
        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const product of data) {
          const category = product.category as { name?: string } | null;
          worksheet.addRow([
            product.external_id ?? product.id,
            product.sku ?? "",
            product.name,
            category?.name ?? "",
            product.subcategory ?? "",
            product.brand ?? "",
            product.mrp === null ? "" : Number(product.mrp),
            product.price === null ? "" : Number(product.price),
            product.quantity ?? "",
            product.unit ?? "",
            product.image_url ?? "",
            product.barcode ?? "",
            product.description ?? "",
            product.is_published ? "Yes" : "No",
          ]).commit();
        }

        lastId = data[data.length - 1].id;
        if (data.length < pageSize) break;
      }

      worksheet.commit();
      await workbook.commit();
    } catch (error) {
      console.error("Product catalogue export failed", error);
      output.destroy(error instanceof Error ? error : new Error("Catalogue export failed."));
    }
  })();

  const body = Readable.toWeb(output) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mini-super-store-products-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
