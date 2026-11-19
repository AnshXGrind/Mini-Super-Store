import { describe, expect, it } from "vitest";
import { getSafeAuthRedirect } from "../lib/auth-redirect";

describe("authentication redirect validation", () => {
  it("allows internal relative paths", () => {
    expect(getSafeAuthRedirect("/account")).toBe("/account");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(getSafeAuthRedirect("https://example.com")).toBe("/dashboard");
    expect(getSafeAuthRedirect("//example.com")).toBe("/dashboard");
  });

  it("rejects backslash-prefixed paths", () => {
    expect(getSafeAuthRedirect("/\\example.com")).toBe("/dashboard");
  });

  it("uses the fallback for missing values", () => {
    expect(getSafeAuthRedirect(null)).toBe("/dashboard");
  });
});
