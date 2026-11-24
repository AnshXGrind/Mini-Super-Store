export function isTemporaryAuthFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!error || typeof error !== "object") return true;

  if ("name" in error && error.name === "AuthRetryableFetchError") return true;
  if ("name" in error && error.name === "AuthInvalidTokenResponseError") return false;
  if ("status" in error && typeof error.status === "number") {
    return error.status === 0 || error.status >= 500;
  }

  return true;
}
