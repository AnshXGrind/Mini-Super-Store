"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="dashboard-empty">
      <h1>We could not load this page</h1>
      <p role="alert">
        Something went wrong while loading this page. Please try again.
        {error.digest ? ` (Reference: ${error.digest})` : ""}
      </p>
      <button type="button" className="dashboard-refresh" onClick={reset}>Try again</button>
    </main>
  );
}
