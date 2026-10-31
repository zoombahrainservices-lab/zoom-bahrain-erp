"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-heading">Home</h1>
      <p className="text-sm text-text-secondary">Home could not be loaded.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-zoom-dark px-3 py-1.5 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
