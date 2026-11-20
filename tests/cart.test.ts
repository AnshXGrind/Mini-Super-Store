import { describe, expect, it } from "vitest";
import { parseStoreCart } from "../lib/cart";

describe("stored cart validation", () => {
  it("restores a valid cart", () => {
    expect(parseStoreCart('{"product-a":2,"product-b":1}')).toEqual({ "product-a": 2, "product-b": 1 });
  });

  it("returns an empty cart for malformed JSON", () => {
    expect(parseStoreCart("not-json")).toEqual({});
  });

  it("rejects arrays and invalid quantities", () => {
    expect(parseStoreCart('["product-a"]')).toEqual({});
    expect(parseStoreCart('{"product-a":0}')).toEqual({});
    expect(parseStoreCart('{"product-a":101}')).toEqual({});
    expect(parseStoreCart('{"product-a":"2"}')).toEqual({});
  });

  it("restores an empty cart for missing storage", () => {
    expect(parseStoreCart(null)).toEqual({});
  });
});