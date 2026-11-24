import { describe, expect, it } from "vitest";
import { isTemporaryAuthFailure } from "../lib/auth-error";

describe("Supabase authentication failure classification", () => {
  it("treats retryable and server failures as temporary", () => {
    expect(isTemporaryAuthFailure({ name: "AuthRetryableFetchError" })).toBe(true);
    expect(isTemporaryAuthFailure({ status: 503 })).toBe(true);
  });

  it("does not mistake rejected sessions for service outages", () => {
    expect(isTemporaryAuthFailure({ status: 401 })).toBe(false);
    expect(isTemporaryAuthFailure({ name: "AuthInvalidTokenResponseError", status: 500 })).toBe(
      false,
    );
  });
});
