import { describe, expect, it } from "vitest";
import {
  getProductImageArt,
  getProductImageUrl,
  isSeedCatalogueImage,
} from "../lib/product-image";

describe("product image handling", () => {
  it("uses compact Unsplash renditions for product cards", () => {
    const source =
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&w=600&q=80";

    expect(getProductImageUrl(source, 420)).toContain("w=420");
    expect(getProductImageUrl(source, 420)).toContain("q=75");
  });

  it("recognizes generic seed photos so product-specific artwork can replace them", () => {
    expect(
      isSeedCatalogueImage(
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format",
      ),
    ).toBe(true);
    expect(
      isSeedCatalogueImage("https://images.unsplash.com/photo-custom-product.png"),
    ).toBe(false);
  });

  it("chooses product artwork based on the product name", () => {
    expect(getProductImageArt("Sugar 1 kg").emoji).toBe("🧂");
    expect(getProductImageArt("Basmati Rice 5 kg").emoji).toBe("🍚");
  });
});
