export type StorefrontVisibilityProduct = {
  name: string;
  category_slug?: string | null;
  category_name?: string | null;
};

const dairyBakeryBreakfastSlug = "dairy-bakery-breakfast";
const dairyBakeryBreakfastName = "dairy, bakery & breakfast";

function isDairyBakeryBreakfastProduct(product: StorefrontVisibilityProduct) {
  const categoryName = product.category_name?.trim().toLocaleLowerCase();
  return (
    product.category_slug === dairyBakeryBreakfastSlug ||
    categoryName === dairyBakeryBreakfastName
  );
}

export function isBreadInRemovedDepartment(product: StorefrontVisibilityProduct) {
  return isDairyBakeryBreakfastProduct(product) && /bread/i.test(product.name);
}

export function isVisibleInStorefront(product: StorefrontVisibilityProduct) {
  return !isDairyBakeryBreakfastProduct(product) || isBreadInRemovedDepartment(product);
}
