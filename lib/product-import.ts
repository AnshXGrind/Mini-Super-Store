export type ProductImportPayload = {
  identifier?: string;
  external_id?: string;
  sku?: string;
  name: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  mrp?: number;
  price?: number;
  quantity?: number;
  unit?: string;
  image_url?: string;
  barcode?: string;
  description?: string;
  is_published?: boolean;
};

export type ProductImportRow = {
  rowNumber: number;
  payload: ProductImportPayload | null;
  validationError?: string;
  skipReason?: string;
  warning?: string;
};

type ImportField = keyof ProductImportPayload;

const headerAliases: Record<ImportField, string[]> = {
  identifier: ["productidsku", "idsku", "identifier", "productidentifier"],
  external_id: ["productid", "externalid", "itemid", "id"],
  sku: ["sku", "productsku", "itemsku", "stockkeepingunit"],
  name: ["productname", "name", "title", "producttitle"],
  category: ["category", "categoryname", "department"],
  subcategory: ["subcategory", "subcategoryname", "subcat"],
  brand: ["brand", "company", "companybrand", "manufacturer"],
  mrp: ["mrp", "maximumretailprice", "listprice"],
  price: ["sellingprice", "saleprice", "price", "retailprice"],
  quantity: ["quantity", "qty", "stock", "stockquantity", "availablequantity"],
  unit: ["unit", "pack", "packsize", "unitpack", "package"],
  image_url: ["productimageurl", "imageurl", "image", "productimage", "imagefile"],
  barcode: ["barcode", "barcodevalue", "ean", "gtin", "upc"],
  description: ["description", "details", "productdescription"],
  is_published: ["isactive", "active", "published", "ispublished", "status"],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseNumber(value: unknown, field: string, rowNumber: number, integer = false) {
  const raw = cleanText(value);
  if (!raw) return { value: undefined, error: undefined };

  const normalized = raw.replace(/[,\s₹$]/g, "");
  const pattern = integer ? /^\d+$/ : /^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/;
  const number = Number(normalized);
  if (!pattern.test(normalized) || !Number.isFinite(number) || number < 0) {
    return {
      value: undefined,
      error: `Row ${rowNumber}: ${field} must be a non-negative ${integer ? "whole number" : "amount with up to 2 decimal places"}.`,
    };
  }
  return { value: number, error: undefined };
}

function parsePublished(value: unknown, rowNumber: number) {
  const raw = cleanText(value).toLowerCase();
  if (!raw) return { value: undefined, error: undefined };
  if (["yes", "true", "1", "active", "published"].includes(raw)) {
    return { value: true, error: undefined };
  }
  if (["no", "false", "0", "inactive", "draft", "unpublished"].includes(raw)) {
    return { value: false, error: undefined };
  }
  return {
    value: undefined,
    error: `Row ${rowNumber}: status must be Yes/No, Active/Inactive, or True/False.`,
  };
}

function validateLength(value: string | undefined, field: string, maxLength: number, rowNumber: number) {
  return value && value.length > maxLength
    ? `Row ${rowNumber}: ${field} must be ${maxLength} characters or fewer.`
    : undefined;
}

export function parseProductImportRows(rows: Array<{ rowNumber: number; values: unknown[] }>): ProductImportRow[] {
  const nonEmptyRows = rows.filter((row) => row.values.some((value) => cleanText(value) !== ""));
  const headerIndex = nonEmptyRows.slice(0, 20).findIndex((row) => {
    const recognized = new Set(row.values.map(normalizeHeader));
    const hasIdentity = headerAliases.external_id.some((alias) => recognized.has(alias)) ||
      headerAliases.sku.some((alias) => recognized.has(alias)) ||
      headerAliases.identifier.some((alias) => recognized.has(alias));
    return hasIdentity && headerAliases.name.some((alias) => recognized.has(alias));
  });
  if (headerIndex === -1) {
    throw new Error("Could not find a header row containing Product ID or SKU and Product Name.");
  }

  const headerRow = nonEmptyRows[headerIndex];
  const columnIndexes = new Map<ImportField, number>();
  headerRow.values.forEach((value, index) => {
    const normalized = normalizeHeader(value);
    for (const [field, aliases] of Object.entries(headerAliases) as Array<[ImportField, string[]]>) {
      if (aliases.includes(normalized) && !columnIndexes.has(field)) {
        columnIndexes.set(field, index);
      }
    }
  });

  if (!columnIndexes.has("external_id") && !columnIndexes.has("sku") && !columnIndexes.has("identifier")) {
    throw new Error("Include a Product ID, SKU, or Product ID / SKU column.");
  }

  const seenIdentifiers = new Set<string>();
  return nonEmptyRows.slice(headerIndex + 1).map(({ rowNumber, values }) => {
    const read = (field: ImportField) => {
      const index = columnIndexes.get(field);
      return index === undefined ? "" : cleanText(values[index]);
    };
    const identifier = read("identifier");
    const externalId = read("external_id");
    const sku = read("sku");
    const name = read("name");
    const category = read("category");
    const subcategory = read("subcategory");
    const brand = read("brand");
    const unit = read("unit");
    const barcode = read("barcode");
    const description = read("description");
    const rawImage = read("image_url");
    const rawMrp = parseNumber(read("mrp"), "MRP", rowNumber);
    const rawPrice = parseNumber(read("price"), "Selling Price", rowNumber);
    const rawQuantity = parseNumber(read("quantity"), "Quantity", rowNumber, true);
    const rawPublished = parsePublished(read("is_published"), rowNumber);
    const errors = [
      rawMrp.error,
      rawPrice.error,
      rawQuantity.error,
      rawPublished.error,
      !externalId && !sku && !identifier ? `Row ${rowNumber}: Product ID or SKU is required.` : undefined,
      !name ? `Row ${rowNumber}: Product Name is required.` : undefined,
      validateLength(identifier, "Product ID / SKU", 120, rowNumber),
      validateLength(externalId, "Product ID", 120, rowNumber),
      validateLength(sku, "SKU", 100, rowNumber),
      validateLength(name, "Product Name", 160, rowNumber),
      validateLength(category, "Category", 160, rowNumber),
      validateLength(subcategory, "Subcategory", 160, rowNumber),
      validateLength(brand, "Brand", 160, rowNumber),
      validateLength(unit, "Unit", 80, rowNumber),
      validateLength(barcode, "Barcode", 100, rowNumber),
      validateLength(description, "Description", 2000, rowNumber),
    ].filter((error): error is string => Boolean(error));
    if (
      identifier.length > 100 &&
      !/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(identifier)
    ) {
      errors.push(`Row ${rowNumber}: Product ID / SKU must be 100 characters or fewer when used as a SKU.`);
    }
    if (read("image_url").length > 2000) {
      errors.push(`Row ${rowNumber}: Product Image URL must be 2000 characters or fewer.`);
    }

    if (rawMrp.value !== undefined && rawPrice.value !== undefined && rawPrice.value > rawMrp.value) {
      errors.push(`Row ${rowNumber}: Selling Price cannot be greater than MRP.`);
    }

    const payload: ProductImportPayload = { name };
    if (identifier) payload.identifier = identifier;
    if (externalId) payload.external_id = externalId;
    if (sku) payload.sku = sku;
    if (category) payload.category = category;
    if (subcategory) payload.subcategory = subcategory;
    if (brand) payload.brand = brand;
    if (rawMrp.value !== undefined) payload.mrp = rawMrp.value;
    if (rawPrice.value !== undefined) payload.price = rawPrice.value;
    if (rawQuantity.value !== undefined) payload.quantity = rawQuantity.value;
    if (unit) payload.unit = unit;
    if (barcode) payload.barcode = barcode;
    if (description) payload.description = description;
    if (rawPublished.value !== undefined) payload.is_published = rawPublished.value;

    let warning: string | undefined;
    if (rawImage) {
      try {
        const imageUrl = new URL(rawImage);
        if (imageUrl.protocol === "http:" || imageUrl.protocol === "https:") {
          payload.image_url = imageUrl.toString();
        } else {
          warning = `Row ${rowNumber}: Image URL must use HTTP or HTTPS; the existing image will be kept.`;
        }
      } catch {
        warning = `Row ${rowNumber}: Image value is not a URL; the existing image will be kept.`;
      }
    }

    if (errors.length > 0) {
      return { rowNumber, payload, validationError: errors.join(" "), warning };
    }

    const identifiers = [
      (externalId || identifier) && `id:${(externalId || identifier)?.toLowerCase()}`,
      (sku || identifier) && `sku:${(sku || identifier)?.toLowerCase()}`,
    ]
      .filter((identifier): identifier is string => Boolean(identifier));
    if (identifiers.some((identifier) => seenIdentifiers.has(identifier))) {
      return {
        rowNumber,
        payload,
        skipReason: `Row ${rowNumber}: Duplicate Product ID or SKU in this file; this row will be skipped.`,
        warning,
      };
    }
    identifiers.forEach((identifier) => seenIdentifiers.add(identifier));
    return { rowNumber, payload, warning };
  });
}
