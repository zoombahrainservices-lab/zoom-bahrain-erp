import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountingFilters } from "@/components/accounting/filters";
import { PrintButton } from "@/components/accounting/forms";
import { DataTable, Panel } from "@/components/accounting/ui";
import { filterQuery } from "@/lib/accounting/filters";
import { loadAccountingPage } from "@/lib/accounting/page";
import { listOrganizations } from "@/lib/accounting/queries";
import { buildReport, isReportId } from "@/lib/accounting/reports";

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string; organization?: string }>;
}) {
  const { report } = await params;
  if (!isReportId(report)) notFound();
  const search = await searchParams;
  const page = await loadAccountingPage(search);
  const table = await buildReport(report, page.filter);
  const query = filterQuery(page.filter);
  const needsParty = report === "customer-statement" || report === "supplier-statement";
  const parties = needsParty ? await listOrganizations() : [];

  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <AccountingFilters filter={page.filter} companies={page.companies} />
        {needsParty ? (
          <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="company" value={page.filter.companyId} />
            <input type="hidden" name="from" value={page.filter.from} />
            <input type="hidden" name="to" value={page.filter.to} />
            <label className="text-sm font-medium text-foreground">
              Organization
              <select name="organization" defaultValue={page.filter.organizationId} className="mt-1 block rounded-lg bg-surface px-2 py-1.5 text-foreground ring-1 ring-border">
                <option value="">Choose</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>{party.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-lg bg-zoom-dark px-3 py-1.5 text-sm font-semibold text-white">Show statement</button>
          </form>
        ) : null}
      </div>
      <Panel
        title={table.title}
        aside={
          <div className="flex gap-2 print:hidden">
            <PrintButton />
            <Link
              href={`/api/accounting/export?format=xls&report=${report}&${query}`}
              className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-heading ring-1 ring-border"
            >
              Download Excel
            </Link>
            <Link
              href={`/api/accounting/pdf?kind=report&report=${report}&${query}`}
              className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-heading ring-1 ring-border"
            >
              Download PDF
            </Link>
          </div>
        }
      >
        <p className="mb-3 text-sm text-text-secondary">{table.note}</p>
        <DataTable headers={table.headers} rows={table.rows} />
      </Panel>
    </div>
  );
}
