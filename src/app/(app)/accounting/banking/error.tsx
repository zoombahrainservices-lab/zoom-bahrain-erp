"use client";

export default function BankingError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-6">
      <h1 className="text-base font-semibold text-heading">Bank accounts could not be loaded.</h1>
      <p className="mt-2 text-sm text-text-secondary">Refresh the page or try the accounts again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-full bg-zoom-dark px-3 py-1 text-xs font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
