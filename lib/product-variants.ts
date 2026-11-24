export type WeightedProduct = {
  id: string;
  name: string;
  name_hi?: string | null;
  brand?: string | null;
  category_id: string | null;
  category_slug?: string | null;
  category_name?: string | null;
  pack_size?: string | null;
};

export type ProductVariantGroup<T extends WeightedProduct> = {
  id: string;
  name: string;
  name_hi: string | null;
  variants: T[];
};

function getWeightInGrams(packSize: string | null | undefined): number | null {
  const match = packSize?.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return match[2].toLowerCase() === "kg" ? amount * 1000 : amount;
}

function getBaseName(product: WeightedProduct): string | null {
  if (getWeightInGrams(product.pack_size) === null || !product.pack_size) {
    return null;
  }
  const match = product.pack_size.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g)$/i);
  if (!match) return null;
  const suffix = new RegExp(`\\s*${match[1]}\\s*${match[2]}\\s*$`, "i");
  const baseName = product.name.replace(suffix, "").replace(/[\s(-]+$/, "").trim();
  return baseName || null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function groupWeightedProductVariants<T extends WeightedProduct>(
  products: T[],
): ProductVariantGroup<T>[] {
  const families = new Map<string, T[]>();

  for (const product of products) {
    const baseName = getBaseName(product);
    if (!baseName) {
      families.set(product.id, [product]);
      continue;
    }

    const familyId = [
      product.category_slug ?? product.category_id ?? product.category_name,
      product.brand,
      baseName,
    ]
      .map(normalize)
      .join(":");
    const family = families.get(familyId) ?? [];
    family.push(product);
    families.set(familyId, family);
  }

  return Array.from(families.entries()).flatMap(([id, family]) => {
    const sizes = new Set(family.map((product) => getWeightInGrams(product.pack_size)));
    if (family.length < 2 || sizes.size < 2) {
      return family.map((product) => ({
        id: product.id,
        name: product.name,
        name_hi: product.name_hi ?? null,
        variants: [product],
      }));
    }

    const variants = [...family].sort(
      (left, right) =>
        (getWeightInGrams(left.pack_size) ?? 0) -
        (getWeightInGrams(right.pack_size) ?? 0),
    );
    const name = getBaseName(variants[0]) ?? variants[0].name;
    const hindiBaseName = variants[0].name_hi
      ? variants[0].name_hi.replace(/[\s(-]*\d+(?:\.\d+)?\s*(?:kg|g)\s*$/i, "").trim()
      : null;

    return [{ id, name, name_hi: hindiBaseName || null, variants }];
  });
}
