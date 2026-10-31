import Link from "next/link";

import { formatBhd } from "@/lib/utils";

import { filsToAmount } from "@/lib/accounting/money";

export function Money({ fils }: { fils: bigint }) {
  return <span className="tabular-nums">{formatBhd(filsToAmount(fils))}</span>;
}

export function Panel({
  title,
  children,
  aside,
}: {
  title?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-surface p-4 ring-1 ring-border">
      {title ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-heading">{title}</h2>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-heading">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{hint}</p>
    </div>
  );
}

export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-secondary">No posted records in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-foreground">
        <thead className="text-text-secondary">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-border px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${row.join("|")}`}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-border px-3 py-2 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GroupNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="text-sm text-text-secondary">
      Group view is a consolidated total in BHD. Each company is converted at the latest saved exchange rate, and balances owed between Zoom companies are removed.
    </p>
  );
}

export function DocumentTable({
  rows,
}: {
  rows: Array<{
    id: string;
    href: string;
    company: string;
    reference: string;
    party: string;
    date: string;
    stage: string;
    amount: string;
    journal: { id: string; journalNumber: string; reversed: boolean } | null;
    outstanding: bigint | null;
  }>;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-secondary">No documents in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-foreground">
        <thead className="text-text-secondary">
          <tr>
            {["Company", "Reference", "Party", "Date", "Status", "Amount", "Ledger", "Outstanding"].map((header) => (
              <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border-b border-border px-3 py-2">{row.company}</td>
              <td className="border-b border-border px-3 py-2">
                <Link href={row.href} className="font-medium text-heading">{row.reference}</Link>
              </td>
              <td className="border-b border-border px-3 py-2">{row.party}</td>
              <td className="border-b border-border px-3 py-2">{row.date}</td>
              <td className="border-b border-border px-3 py-2">{row.stage}</td>
              <td className="border-b border-border px-3 py-2 tabular-nums">{row.amount}</td>
              <td className="border-b border-border px-3 py-2">
                {row.journal ? (
                  <Link href={`/accounting/journals/${row.journal.id}`} className="text-heading">
                    {row.journal.journalNumber}
                    {row.journal.reversed ? " reversed" : ""}
                  </Link>
                ) : (
                  "Not posted"
                )}
              </td>
              <td className="border-b border-border px-3 py-2">
                {row.outstanding === null ? "—" : <Money fils={row.outstanding} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
