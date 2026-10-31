import Link from "next/link";

import { AccountingFilters } from "@/components/accounting/filters";
import { GroupNotice, Metric, Money, Panel } from "@/components/accounting/ui";
import { Button } from "@/components/catalyst/button";
import { getDivisionName } from "@/lib/divisions";
import { loadAccountingPage } from "@/lib/accounting/page";
import { getDashboard } from "@/lib/accounting/queries";
import { formatBhd } from "@/lib/utils";

export default async function AccountingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    company?: string;
    from?: string;
    to?: string;
    year?: string;
  }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const dashboard = await getDashboard(page.filter);
  const figures = page.filter.companyId === "all" ? dashboard.totals : dashboard.companies[0];

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <GroupNotice show={page.filter.companyId === "all"} />
      {dashboard.missingRates.length > 0 ? (
        <p className="text-sm text-text-secondary">
          Save an exchange rate to BHD before these companies can be included in the consolidated total: {dashboard.missingRates.join(", ")}.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Cash" value={<Money fils={figures?.cash ?? 0n} />} hint="Balance as of the end date" />
        <Metric label="Bank" value={<Money fils={figures?.bank ?? 0n} />} hint="Balance as of the end date" />
        <Metric label="Customer receivables" value={<Money fils={figures?.receivables ?? 0n} />} hint="Outstanding as of the end date" />
        <Metric label="Supplier payables" value={<Money fils={figures?.payables ?? 0n} />} hint="Outstanding as of the end date" />
        <Metric label="Sales revenue" value={<Money fils={figures?.sales ?? 0n} />} hint="Posted in the selected period" />
        <Metric label="Expenses" value={<Money fils={figures?.expenses ?? 0n} />} hint="Posted in the selected period" />
        <Metric label="Net profit / loss" value={<Money fils={figures?.profit ?? 0n} />} hint="Income minus expenses for the period" />
        <Metric label="Overdue invoices" value={dashboard.overdue.length} hint="Current invoice status, not an estimate" />
      </div>

      <Panel title="Quick actions">
        <div className="flex flex-wrap gap-2">
          <Button href="/accounting/desk">Create invoice</Button>
          <Button href="/accounting/purchases" outline>Record expense</Button>
          <Button href="/accounting/payments" outline>Receive payment</Button>
          <Button href="/accounting/payments" outline>Make supplier payment</Button>
          <Button href="/accounting/journals/new" outline>Create journal entry</Button>
        </div>
      </Panel>

      {page.filter.companyId === "all" ? (
        <Panel title="Company totals">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="text-text-secondary">
                <tr>
                  {["Company", "Cash", "Bank", "Receivables", "Payables", "Sales", "Expenses", "Profit"].map((header) => (
                    <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboard.companies.map((company) => (
                  <tr key={company.companyId}>
                    <td className="border-b border-border px-3 py-2">{company.companyName}</td>
                    <td className="border-b border-border px-3 py-2"><Money fils={company.cash} /></td>
                    <td className="border-b border-border px-3 py-2"><Money fils={company.bank} /></td>
                    <td className="border-b border-border px-3 py-2"><Money fils={company.receivables} /></td>
                    <td className="border-b border-border px-3 py-2"><Money fils={company.payables} /></td>
                    <td className="border-b border-border px-3 py-2"><Money fils={company.sales} /></td>
                    <td className="border-b border-border px-3 py-2"><Money fils={company.expenses} /></td>
                    <td className="border-b border-border px-3 py-2"><Money fils={company.profit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Overdue invoices">
          {dashboard.overdue.length === 0 ? (
            <p className="text-sm text-text-secondary">No overdue invoices.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dashboard.overdue.map((invoice) => (
                <li key={invoice.id}>
                  <Link href={`/operations/${invoice.operation?.id}`} className="font-medium text-heading">
                    {invoice.operation?.operationCode}
                  </Link>
                  <span className="text-text-secondary">
                    {" "}
                    · {invoice.operation?.organization?.name ?? "No customer"} · {getDivisionName(invoice.operation?.divisionId ?? "")} · {formatBhd(invoice.amount) || "No amount"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent posted journals">
          {dashboard.recent.length === 0 ? (
            <p className="text-sm text-text-secondary">No posted journals in this range.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {dashboard.recent.map((journal) => (
                <li key={journal.id}>
                  <Link href={`/accounting/journals/${journal.id}`} className="font-medium text-heading">
                    {journal.journalNumber}
                  </Link>
                  <span className="text-text-secondary">
                    {" "}
                    · {journal.entryDate} · {journal.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
