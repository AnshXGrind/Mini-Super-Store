import { describe, expect, it } from "vitest";
import { groupWeightedProductVariants } from "../lib/product-variants";

const product = (
  id: string,
  name: string,
  pack_size: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  name,
  name_hi: null,
  brand: null,
  category_id: "staples",
  category_slug: "staples-grains",
  category_name: "Staples & Grains",
  pack_size,
  ...overrides,
});

describe("weighted product variants", () => {
  it("groups same products with multiple weight sizes and orders sizes smallest first", () => {
    const groups = groupWeightedProductVariants([
      product("sugar-5kg", "Sugar 5 kg", "5 kg"),
      product("sugar-1kg", "Sugar 1 kg", "1 kg"),
      product("sugar-500g", "Sugar 500 g", "500 g"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Sugar");
    expect(groups[0].variants.map((item) => item.id)).toEqual([
      "sugar-500g",
      "sugar-1kg",
      "sugar-5kg",
    ]);
  });

  it("does not combine different brands or non-weight packages", () => {
    const groups = groupWeightedProductVariants([
      product("atta-a-1", "Atta 1 kg", "1 kg", { brand: "Brand A" }),
      product("atta-a-5", "Atta 5 kg", "5 kg", { brand: "Brand A" }),
      product("atta-b-1", "Atta 1 kg", "1 kg", { brand: "Brand B" }),
      product("oil-1l", "Cooking Oil 1 L", "1 L"),
    ]);

    expect(groups).toHaveLength(3);
    expect(groups.filter((group) => group.variants.length > 1)).toHaveLength(1);
  });
});
