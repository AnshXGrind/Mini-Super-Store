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
      <p role="alert">{error.message || "Please try again."}</p>
      <button type="button" className="dashboard-refresh" onClick={reset}>Try again</button>
    </main>
  );
}
