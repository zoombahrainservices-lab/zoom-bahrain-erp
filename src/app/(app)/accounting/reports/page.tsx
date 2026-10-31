import Link from "next/link";

import { AccountingFilters } from "@/components/accounting/filters";
import { Panel } from "@/components/accounting/ui";
import { filterQuery } from "@/lib/accounting/filters";
import { loadAccountingPage } from "@/lib/accounting/page";
import { reportCatalog } from "@/lib/accounting/reports";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const query = filterQuery(page.filter);

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <Panel title="Financial reports">
        <p className="mb-3 text-sm text-text-secondary">
          Every figure is calculated from posted journals. Excel is a spreadsheet file. PDF is generated in Zoom and does not use Google Drive. Print uses the browser. A total across companies is converted to BHD and amounts owed between Zoom companies are removed.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {reportCatalog.map((report) => (
            <li key={report.id}>
              <Link href={`/accounting/reports/${report.id}?${query}`} className="font-medium text-heading">
                {report.title}
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
