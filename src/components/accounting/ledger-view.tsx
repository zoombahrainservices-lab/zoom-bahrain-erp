import Link from "next/link";

import { Money, Panel } from "@/components/accounting/ui";
import { toFils } from "@/lib/accounting/money";
import { getDivisionName } from "@/lib/divisions";
import { formatBhd } from "@/lib/utils";

export function LedgerView({
  title,
  code,
  lines,
}: {
  title: string;
  code?: string | null;
  lines: Array<{
    journal_id: string;
    journal_number: string;
    entry_date: string;
    description: string;
    company_id: string;
    code: string;
    account_name: string;
    debit: string;
    credit: string;
    subtype: string | null;
  }>;
}) {
  let receivable = 0n;
  let payable = 0n;
  for (const line of lines) {
    if (line.subtype === "receivable") receivable += toFils(line.debit) - toFils(line.credit);
    if (line.subtype === "payable") payable += toFils(line.credit) - toFils(line.debit);
  }

  return (
    <div className="space-y-4">
      <Panel title={title}>
        <p className="text-sm text-text-secondary">{code || "Organization ledger"}</p>
        <div className="mt-3 flex flex-wrap gap-6 text-sm">
          <p>Receivable <Money fils={receivable} /></p>
          <p>Payable <Money fils={payable} /></p>
        </div>
      </Panel>
      <Panel title="Transactions">
        {lines.length === 0 ? (
          <p className="text-sm text-text-secondary">No posted lines for this party up to the selected end date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="text-text-secondary">
                <tr>
                  {["Date", "Company", "Journal", "Account", "Description", "Debit", "Credit"].map((header) => (
                    <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={`${line.journal_id}-${index}`}>
                    <td className="border-b border-border px-3 py-2">{line.entry_date}</td>
                    <td className="border-b border-border px-3 py-2">{getDivisionName(line.company_id)}</td>
                    <td className="border-b border-border px-3 py-2">
                      <Link href={`/accounting/journals/${line.journal_id}`} className="text-heading">
                        {line.journal_number}
                      </Link>
                    </td>
                    <td className="border-b border-border px-3 py-2">{line.code} {line.account_name}</td>
                    <td className="border-b border-border px-3 py-2">{line.description}</td>
                    <td className="border-b border-border px-3 py-2 tabular-nums">{formatBhd(line.debit)}</td>
                    <td className="border-b border-border px-3 py-2 tabular-nums">{formatBhd(line.credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
