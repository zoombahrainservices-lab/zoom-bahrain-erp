import Link from "next/link";

import { AccountingFilters } from "@/components/accounting/filters";
import { Panel } from "@/components/accounting/ui";
import { Button } from "@/components/catalyst/button";
import { filterQuery } from "@/lib/accounting/filters";
import { loadAccountingPage } from "@/lib/accounting/page";
import { listJournals } from "@/lib/accounting/queries";
import { getDivisionName } from "@/lib/divisions";

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const journals = await listJournals(page.filter);

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <Panel
        title="Journal entries"
        aside={<Button href={`/accounting/journals/new?${filterQuery(page.filter)}`}>New journal</Button>}
      >
        {journals.length === 0 ? (
          <p className="text-sm text-text-secondary">No journals in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="text-text-secondary">
                <tr>
                  {["Number", "Date", "Company", "Description", "Source", "Status"].map((header) => (
                    <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {journals.map((journal) => (
                  <tr key={journal.id}>
                    <td className="border-b border-border px-3 py-2">
                      <Link href={`/accounting/journals/${journal.id}`} className="font-medium text-heading">
                        {journal.journalNumber}
                      </Link>
                    </td>
                    <td className="border-b border-border px-3 py-2">{journal.entryDate}</td>
                    <td className="border-b border-border px-3 py-2">{getDivisionName(journal.companyId)}</td>
                    <td className="border-b border-border px-3 py-2">{journal.description}</td>
                    <td className="border-b border-border px-3 py-2">{journal.sourceType}</td>
                    <td className="border-b border-border px-3 py-2">
                      {journal.status}
                      {journal.reversedById ? " · reversed" : ""}
                    </td>
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
