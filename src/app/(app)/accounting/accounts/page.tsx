import { AccountingFilters } from "@/components/accounting/filters";
import { AccountForm, OpeningForm, PeriodButton } from "@/components/accounting/forms";
import { Panel } from "@/components/accounting/ui";
import { accountTypeLabels } from "@/lib/accounting/chart";
import { loadAccountingPage } from "@/lib/accounting/page";
import { listAccounts, listPeriods } from "@/lib/accounting/queries";
import { getDivisionName } from "@/lib/divisions";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const [accounts, periods] = await Promise.all([
    listAccounts(page.filter.companyId),
    listPeriods(page.filter.companyId),
  ]);

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <Panel title="Chart of accounts">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="text-text-secondary">
              <tr>
                {["Company", "Code", "Name", "Category", "Status"].map((header) => (
                  <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="border-b border-border px-3 py-2">{getDivisionName(account.companyId)}</td>
                  <td className="border-b border-border px-3 py-2 tabular-nums">{account.code}</td>
                  <td className="border-b border-border px-3 py-2">{account.parentId ? `· ${account.name}` : account.name}</td>
                  <td className="border-b border-border px-3 py-2">{accountTypeLabels[account.accountType]}</td>
                  <td className="border-b border-border px-3 py-2">{account.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {page.canManageSettings ? (
        <Panel title="Add an account">
          <AccountForm companies={page.companies} />
        </Panel>
      ) : null}
      {page.canPost ? (
        <Panel title="Opening balance">
          <p className="mb-3 text-sm text-text-secondary">
            One opening journal per account, offset to opening balance equity. Correct it by reversing that journal.
          </p>
          <OpeningForm
            companies={page.companies}
            accounts={accounts.map((account) => ({
              id: account.id,
              companyId: account.companyId,
              code: account.code,
              name: account.name,
              accountType: account.accountType,
            }))}
          />
        </Panel>
      ) : null}
      <Panel title="Financial years">
        <ul className="space-y-2 text-sm">
          {periods.map((period) => (
            <li key={period.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {getDivisionName(period.companyId)} · {period.name} · {period.startsOn} to {period.endsOn} · {period.status}
              </span>
              {page.canManageSettings ? (
                <PeriodButton periodId={period.id} status={period.status} />
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
