export type StoreCart = Record<string, number>;

export function parseStoreCart(value: string | null): StoreCart {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed);
    if (!entries.every(([id, quantity]) => (
      id.trim().length > 0 &&
      typeof quantity === "number" &&
      Number.isInteger(quantity) &&
      quantity >= 1 &&
      quantity <= 100
    ))) return {};
    return Object.fromEntries(entries) as StoreCart;
  } catch {
    return {};
  }
}