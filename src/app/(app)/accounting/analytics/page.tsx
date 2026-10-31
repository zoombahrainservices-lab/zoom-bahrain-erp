import { sql } from "drizzle-orm";

import { AccountingFilters } from "@/components/accounting/filters";
import { Panel } from "@/components/accounting/ui";
import { db } from "@/db";
import { loadAccountingPage } from "@/lib/accounting/page";
import { filsToAmount, toFils } from "@/lib/accounting/money";
import { profitMargin } from "@/lib/accounting/phase3-rules";
import { getDivisionName } from "@/lib/divisions";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const company = page.filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${page.filter.companyId}`;
  const rows = await db.execute(sql`
    SELECT to_char(j.entry_date, 'YYYY-MM') AS month,
           COALESCE(SUM(CASE WHEN a.account_type = 'income' THEN l.credit - l.debit ELSE 0 END), 0)::text AS revenue,
           COALESCE(SUM(CASE WHEN a.account_type = 'expense' AND a.subtype = 'purchases' THEN l.debit - l.credit ELSE 0 END), 0)::text AS cost,
           COALESCE(SUM(CASE WHEN a.account_type = 'expense' AND COALESCE(a.subtype, '') <> 'purchases' THEN l.debit - l.credit ELSE 0 END), 0)::text AS operating
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted' AND j.reversed_by_id IS NULL
      AND j.entry_date >= ${page.filter.from}::date
      AND j.entry_date <= ${page.filter.to}::date
      AND a.account_type IN ('income', 'expense')
      ${company}
    GROUP BY 1
    ORDER BY 1
  `);
  const months = asRows(rows);
  const revenue = months.reduce((sum, row) => sum + toFils(row.revenue ?? "0"), 0n);
  const cost = months.reduce((sum, row) => sum + toFils(row.cost ?? "0"), 0n);
  const operating = months.reduce((sum, row) => sum + toFils(row.operating ?? "0"), 0n);
  const gross = revenue - cost;
  const net = gross - operating;
  const max = months.reduce((peak, row) => {
    const value = toFils(row.revenue ?? "0") + toFils(row.operating ?? "0") + toFils(row.cost ?? "0");
    return value > peak ? value : peak;
  }, 1n);

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <Panel title="Accrual results">
        <p className="mb-3 text-sm text-text-secondary">
          Revenue and expenses are posted income and expense accounts. They are not cash movement. {page.filter.companyId === "all" ? "All-company totals are added together and are not a consolidated statement." : getDivisionName(page.filter.companyId)}
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Revenue" value={filsToAmount(revenue)} />
          <Metric label="Expenses" value={filsToAmount(cost + operating)} />
          <Metric label="Gross profit" value={filsToAmount(gross)} />
          <Metric label="Net profit" value={`${filsToAmount(net)} · margin ${profitMargin(net, revenue) ?? "—"}%`} />
        </div>
      </Panel>
      <Panel title="Revenue and expenses by month">
        {months.length === 0 ? <p className="text-sm text-text-secondary">No posted income or expense in this period.</p> : (
          <ul className="space-y-3">
            {months.map((row) => (
              <li key={row.month}>
                <div className="mb-1 flex justify-between text-sm text-foreground">
                  <span>{row.month}</span>
                  <span className="tabular-nums">{filsToAmount(toFils(row.revenue ?? "0") - toFils(row.cost ?? "0") - toFils(row.operating ?? "0"))}</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded bg-surface ring-1 ring-border">
                  <span className="bg-emerald-600" style={{ width: `${bar(toFils(row.revenue ?? "0"), max)}%` }} />
                  <span className="bg-rose-600" style={{ width: `${bar(toFils(row.cost ?? "0") + toFils(row.operating ?? "0"), max)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-text-secondary">Green is revenue. Red is expenses. Open a report and then the journal for the document behind a figure.</p>
      </Panel>
      <CashPosition filter={page.filter} />
      <CompanyComparison />
      <Collections filter={page.filter} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface p-3 ring-1 ring-border">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-heading">{value}</p>
    </div>
  );
}

function bar(value: bigint, max: bigint) {
  return Number((value * 100n) / max);
}

async function CashPosition({ filter }: { filter: { companyId: string; from: string; to: string } }) {
  const company = filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const rows = await db.execute(sql`
    SELECT COALESCE(a.subtype, '') AS subtype,
           COALESCE(SUM(l.debit - l.credit), 0)::text AS net
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted' AND j.reversed_by_id IS NULL
      AND j.entry_date <= ${filter.to}::date
      AND a.subtype IN ('cash', 'bank', 'receivable', 'payable')
      ${company}
    GROUP BY a.subtype
  `);
  const totals = new Map(asRows(rows).map((row) => [row.subtype ?? "", toFils(row.net ?? "0")]));
  const cash = (totals.get("cash") ?? 0n) + (totals.get("bank") ?? 0n);
  const receivable = totals.get("receivable") ?? 0n;
  const payable = -1n * (totals.get("payable") ?? 0n);
  return (
    <Panel title="Cash and balances">
      <p className="mb-3 text-sm text-text-secondary">These are posted ledger balances as of {filter.to}. They are not the accrual profit above.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Cash and bank" value={filsToAmount(cash)} />
        <Metric label="Accounts receivable" value={filsToAmount(receivable)} />
        <Metric label="Accounts payable" value={filsToAmount(payable)} />
      </div>
    </Panel>
  );
}

async function CompanyComparison() {
  const rows = await db.execute(sql`
    SELECT j.company_id,
           COALESCE(SUM(CASE WHEN a.account_type = 'income' THEN l.credit - l.debit ELSE 0 END), 0)::text AS revenue,
           COALESCE(SUM(CASE WHEN a.account_type = 'expense' THEN l.debit - l.credit ELSE 0 END), 0)::text AS expense
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted' AND j.reversed_by_id IS NULL
      AND a.account_type IN ('income', 'expense')
    GROUP BY j.company_id
    ORDER BY j.company_id
  `);
  const listed = asRows(rows);
  return (
    <Panel title="Company comparison">
      <p className="mb-3 text-sm text-text-secondary">Each row stays in that company's own books. The consolidated BHD total, with amounts between companies removed, is on the dashboard and in Reports.</p>
      <ul className="space-y-1 text-sm text-foreground">
        {listed.map((row) => {
          const revenue = toFils(row.revenue ?? "0");
          const expense = toFils(row.expense ?? "0");
          return (
            <li key={row.company_id}>{getDivisionName(row.company_id ?? "")} · revenue {filsToAmount(revenue)} · expenses {filsToAmount(expense)} · profit {filsToAmount(revenue - expense)}</li>
          );
        })}
        {listed.length === 0 ? <li className="text-text-secondary">No posted income or expense yet.</li> : null}
      </ul>
    </Panel>
  );
}

async function Collections({ filter }: { filter: { companyId: string; to: string } }) {
  const company = filter.companyId === "all" ? sql`` : sql`AND op.division_id = ${filter.companyId}`;
  const rows = await db.execute(sql`
    SELECT COALESCE(SUM(CASE WHEN e.due_on >= ${filter.to}::date THEN e.amount ELSE 0 END), 0)::text AS upcoming,
           COALESCE(SUM(CASE WHEN e.due_on < ${filter.to}::date THEN e.amount ELSE 0 END), 0)::text AS overdue
    FROM operation_entries e
    INNER JOIN operations op ON op.id = e.operation_id
    WHERE e.entry_type = 'invoice'
      AND e.document_stage IN ('sent', 'overdue')
      AND e.due_on IS NOT NULL
      ${company}
  `);
  const row = asRows(rows)[0];
  return (
    <Panel title="Collection projection">
      <p className="mb-3 text-sm text-text-secondary">This is the face value of open invoices by due date. It is not cash received and it ignores partial payments.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label="Due after the period end" value={row?.upcoming ?? "0.000"} />
        <Metric label="Open and past due" value={row?.overdue ?? "0.000"} />
      </div>
    </Panel>
  );
}

function asRows(rows: unknown) {
  const list = Array.isArray(rows) ? rows : rows && typeof rows === "object" && "rows" in rows ? (rows as { rows: unknown }).rows : [];
  return (Array.isArray(list) ? list : []) as Array<{
    month?: string;
    revenue?: string;
    cost?: string;
    operating?: string;
    subtype?: string;
    net?: string;
    company_id?: string;
    expense?: string;
    upcoming?: string;
    overdue?: string;
  }>;
}
