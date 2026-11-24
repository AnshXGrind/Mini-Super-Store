import ExcelJS from "exceljs";
import Papa from "papaparse";
import { parseProductImportRows, type ProductImportRow } from "./product-import";

export async function readProductImportFile(file: File): Promise<ProductImportRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse<string[]>(file, {
        skipEmptyLines: false,
        worker: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(`CSV parsing failed on row ${(result.errors[0].row ?? 0) + 1}: ${result.errors[0].message}`));
            return;
          }
          resolve(parseProductImportRows(
            result.data.map((values, index) => ({ rowNumber: index + 1, values })),
          ));
        },
        error: reject,
      });
    });
  }
  if (extension !== "xlsx") throw new Error("Choose an .xlsx or .csv file.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets.find((worksheet) => worksheet.name.toLowerCase() === "products") ??
    workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook does not contain a readable worksheet.");

  const rows: Array<{ rowNumber: number; values: unknown[] }> = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: unknown[] = [];
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      values.push(row.getCell(column).text);
    }
    rows.push({ rowNumber: row.number, values });
  });
  return parseProductImportRows(rows);
}
