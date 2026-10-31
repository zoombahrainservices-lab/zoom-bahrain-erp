import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { BankWorkspace } from "@/components/accounting/bank-workspace";
import { AccountingFilters } from "@/components/accounting/filters";
import { BankForm, TransferForm } from "@/components/accounting/forms";
import { BankMovementForm, ReconciliationForm, StatementImportForm } from "@/components/accounting/phase2-forms";
import { db } from "@/db";
import { accountingReconciliations } from "@/db/schema";
import { bankAccountHref, bankKindLabel, bankMovementLabel } from "@/lib/accounting/bank-labels";
import { maskAccount } from "@/lib/accounting/documents";
import { filterQuery, type AccountingFilter } from "@/lib/accounting/filters";
import { filsToAmount } from "@/lib/accounting/money";
import { accountTotals, bankActivity, listAccounts, listBankAccounts } from "@/lib/accounting/queries";
import { getDivisionName } from "@/lib/divisions";
import { formatBhd } from "@/lib/utils";

type AccountingPage = {
  filter: AccountingFilter;
  companies: Array<{ id: string; name: string }>;
  canPost: boolean;
  canManageSettings: boolean;
};

export async function BankScreen({
  page,
  selectedId,
  unavailable = false,
}: {
  page: AccountingPage;
  selectedId?: string;
  unavailable?: boolean;
}) {
  const query = filterQuery(page.filter);
  const [banks, totals, reconciliations, accounts] = await Promise.all([
    listBankAccounts(page.filter.companyId),
    accountTotals(page.filter, "asof"),
    db.query.accountingReconciliations.findMany({
      where:
        page.filter.companyId === "all"
          ? undefined
          : eq(accountingReconciliations.companyId, page.filter.companyId),
      orderBy: [desc(accountingReconciliations.createdAt)],
      limit: 20,
    }),
    listAccounts(page.filter.companyId),
  ]);
  const balances = new Map<string, bigint>(
    totals.map((row) => [row.id, row.debitFils - row.creditFils]),
  );
  const rows = banks.map((bank) => ({
    id: bank.id,
    href: bankAccountHref(bank.id, query),
    name: bank.name,
    kind: bank.kind,
    kindLabel: bankKindLabel(bank.kind),
    companyName: getDivisionName(bank.companyId),
    detail: [bank.institution, bank.accountNumber ? maskAccount(bank.accountNumber) : ""]
      .filter(Boolean)
      .join(" · "),
    balance: formatBhd(filsToAmount(balances.get(bank.accountId) ?? 0n)),
    active: bank.isActive === 1,
    institution: bank.institution,
    accountNumber: bank.accountNumber ? maskAccount(bank.accountNumber) : "",
    currency: bank.currency,
    ledger: [bank.account?.code, bank.account?.name].filter(Boolean).join(" "),
    accountId: bank.accountId,
    companyId: bank.companyId,
  }));
  const selected = selectedId ? rows.find((row) => row.id === selectedId) ?? null : null;
  const activity = selected
    ? await bankActivity(page.filter, selected.accountId)
    : [];
  const bankOptions = banks.map((bank) => ({
    id: bank.id,
    companyId: bank.companyId,
    name: bank.name,
    kind: bank.kind,
  }));
  const orderedBanks = selected
    ? [
        ...bankOptions.filter((bank) => bank.id === selected.id),
        ...bankOptions.filter((bank) => bank.id !== selected.id),
      ]
    : bankOptions;
  const selectedReconciliations = reconciliations
    .filter((row) => !selected || row.bankAccountId === selected.id)
    .map((row) => ({
      id: row.id,
      href: bankAccountHref(row.id, query),
      label: `${row.periodStart} to ${row.periodEnd}`,
      status: row.status,
      difference: formatBhd(row.difference),
    }));

  return (
    <BankWorkspace
      filters={<AccountingFilters filter={page.filter} companies={page.companies} />}
      accounts={rows}
      showCompany={page.filter.companyId === "all"}
      selected={selected}
      unavailable={unavailable || (Boolean(selectedId) && !selected)}
      listHref={bankAccountHref(null, query)}
      balanceNote={`Balances are posted journals as of ${page.filter.to}. They are not the sum of the movements listed below. Importing a statement does not create a journal. There is no live bank connection.`}
      movementNote={`Posted movements from ${page.filter.from} to ${page.filter.to}.`}
      transactions={activity.map((line, index) => {
        const type = bankMovementLabel(line.source_type, line.line_description);
        const party = line.party_name?.trim() ?? "";
        const description = line.description?.trim() ?? "";
        return {
          id: `${line.journal_id}-${index}`,
          journalHref: `/accounting/journals/${line.journal_id}`,
          date: line.entry_date,
          type,
          name: party || description || "—",
          detail: party && description && description !== party && description.toLowerCase() !== type.toLowerCase()
            ? description
            : "",
          reference: line.journal_number,
          debit: formatBhd(line.debit),
          credit: formatBhd(line.credit),
        };
      })}
      transactionLimitReached={activity.length === 200}
      reconciliations={selectedReconciliations}
      transfer={<TransferForm companies={page.companies} banks={orderedBanks} />}
      statementImport={
        <StatementImportForm companyId={page.filter.companyId} banks={orderedBanks} />
      }
      reconcile={
        <div className="space-y-3">
          <ReconciliationForm companyId={page.filter.companyId} banks={orderedBanks} />
          {selectedReconciliations.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {selectedReconciliations.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className="font-medium text-heading">
                    {row.label}
                  </Link>
                  <span className="text-text-secondary">
                    {" "}
                    · {row.status} · difference {row.difference}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No reconciliations in this list yet.</p>
          )}
        </div>
      }
      movement={
        page.canPost && selected && selected.companyId ? (
          <BankMovementForm
            companyId={selected.companyId}
            banks={bankOptions.filter((bank) => bank.companyId === selected.companyId)}
            accounts={accounts
              .filter((account) => account.companyId === selected.companyId)
              .map((account) => ({
                id: account.id,
                companyId: account.companyId,
                code: account.code,
                name: account.name,
                accountType: account.accountType,
              }))}
          />
        ) : page.canPost && page.filter.companyId !== "all" ? (
          <BankMovementForm
            companyId={page.filter.companyId}
            banks={bankOptions.filter((bank) => bank.companyId === page.filter.companyId)}
            accounts={accounts.map((account) => ({
              id: account.id,
              companyId: account.companyId,
              code: account.code,
              name: account.name,
              accountType: account.accountType,
            }))}
          />
        ) : null
      }
      addAccount={page.canManageSettings ? <BankForm companies={page.companies} /> : null}
    />
  );
}
