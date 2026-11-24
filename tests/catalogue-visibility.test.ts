import { describe, expect, it } from "vitest";
import {
  isBreadInRemovedDepartment,
  isVisibleInStorefront,
} from "../lib/catalogue-visibility";

describe("isVisibleInStorefront", () => {
  it("hides items in the former dairy, bakery, and breakfast department", () => {
    expect(
      isVisibleInStorefront({
        name: "Corn Flakes",
        category_slug: "dairy-bakery-breakfast",
      }),
    ).toBe(false);
  });

  it("keeps bread items in that department", () => {
    const bread = { name: "Brown Bread", category_slug: "dairy-bakery-breakfast" };
    expect(isVisibleInStorefront(bread)).toBe(true);
    expect(isBreadInRemovedDepartment(bread)).toBe(true);
  });

  it("does not hide other departments", () => {
    expect(
      isVisibleInStorefront({
        name: "Corn Flakes",
        category_slug: "snacks-biscuits-beverages",
      }),
    ).toBe(true);
  });
});
