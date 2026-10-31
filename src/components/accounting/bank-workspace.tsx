"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

import { Link } from "@/components/catalyst/link";

export type BankAccountRow = {
  id: string;
  href: string;
  name: string;
  kind: string;
  kindLabel: string;
  companyName: string;
  detail: string;
  balance: string;
  active: boolean;
};

export type BankAccountDetail = BankAccountRow & {
  institution: string;
  accountNumber: string;
  currency: string;
  ledger: string;
};

export type BankTransactionRow = {
  id: string;
  journalHref: string;
  date: string;
  type: string;
  name: string;
  detail: string;
  reference: string;
  debit: string;
  credit: string;
};

export type BankReconciliationRow = {
  id: string;
  href: string;
  label: string;
  status: string;
  difference: string;
};

type BankWorkspaceProps = {
  filters: ReactNode;
  accounts: BankAccountRow[];
  showCompany: boolean;
  selected: BankAccountDetail | null;
  unavailable: boolean;
  listHref: string;
  balanceNote: string;
  movementNote: string;
  transactions: BankTransactionRow[];
  transactionLimitReached: boolean;
  reconciliations: BankReconciliationRow[];
  transfer: ReactNode;
  statementImport: ReactNode;
  reconcile: ReactNode;
  movement: ReactNode | null;
  addAccount: ReactNode | null;
};

const leaveMessage = "Leave this form? Entries that are not saved will be lost.";

export function BankWorkspace({
  filters,
  accounts,
  showCompany,
  selected,
  unavailable,
  listHref,
  balanceNote,
  movementNote,
  transactions,
  transactionLimitReached,
  reconciliations,
  transfer,
  statementImport,
  reconcile,
  movement,
  addAccount,
}: BankWorkspaceProps) {
  const router = useRouter();
  const [accountQuery, setAccountQuery] = useState("");
  const [transactionQuery, setTransactionQuery] = useState("");
  const [action, setAction] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  function confirmLeave() {
    if (!dirty) return true;
    return window.confirm(leaveMessage);
  }

  function follow(href: string) {
    if (!confirmLeave()) return;
    setDirty(false);
    router.push(href);
  }

  function guardLink(event: { target: EventTarget | null; preventDefault: () => void }) {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest("a")) return;
    if (!confirmLeave()) event.preventDefault();
  }

  function guardSubmit(event: FormEvent) {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || target.method.toLowerCase() !== "get") return;
    if (!confirmLeave()) event.preventDefault();
  }

  function chooseAction(next: string) {
    if (action === next) {
      if (!confirmLeave()) return;
      setDirty(false);
      setAction(null);
      return;
    }
    if (!confirmLeave()) return;
    setDirty(false);
    setAction(next);
  }

  const filteredAccounts = useMemo(() => {
    const needle = accountQuery.trim().toLowerCase();
    if (!needle) return accounts;
    return accounts.filter((account) =>
      [account.name, account.kindLabel, account.companyName, account.detail, account.balance]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [accountQuery, accounts]);

  const filteredTransactions = useMemo(() => {
    const needle = transactionQuery.trim().toLowerCase();
    if (!needle) return transactions;
    return transactions.filter((row) =>
      [row.date, row.type, row.name, row.detail, row.reference, row.debit, row.credit]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [transactionQuery, transactions]);

  const groups = groupAccounts(filteredAccounts);
  const actions = [
    { id: "transfer", label: "Transfer", body: transfer },
    { id: "import", label: "Import statement", body: statementImport },
    { id: "reconcile", label: "Reconcile", body: reconcile },
    movement ? { id: "movement", label: "Bank movement", body: movement } : null,
    addAccount ? { id: "add", label: "Add bank account", body: addAccount } : null,
  ].filter((item): item is { id: string; label: string; body: ReactNode } => Boolean(item));
  const openAction = actions.find((item) => item.id === action) ?? null;

  return (
    <div className="flex flex-col gap-3" onSubmit={guardSubmit}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-heading">Bank Accounts</h1>
          <p className="mt-1 max-w-3xl text-xs text-text-secondary">{balanceNote}</p>
        </div>
        {filters}
      </div>

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={action === item.id}
              onClick={() => chooseAction(item.id)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 ring-border",
                action === item.id
                  ? "bg-zoom-dark text-white ring-zoom-dark"
                  : "bg-background text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {openAction ? (
        <div
          className="rounded-lg border border-border bg-surface px-4 py-3"
          onInput={() => setDirty(true)}
          onClick={guardLink}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-heading">{openAction.label}</h2>
            <button
              type="button"
              className="text-xs font-medium text-heading"
              onClick={() => chooseAction(openAction.id)}
            >
              Close
            </button>
          </div>
          {openAction.body}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-col gap-3 lg:h-[calc(100dvh-8.5rem)] lg:flex-row">
        <aside
          className={clsx(
            "min-h-0 flex-col rounded-lg border border-border bg-surface lg:flex lg:w-72 lg:shrink-0",
            selected || unavailable ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="border-b border-border p-2">
            <label className="block text-xs font-medium text-text-secondary">
              Search accounts
              <input
                value={accountQuery}
                onChange={(event) => setAccountQuery(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-heading"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {accounts.length === 0 ? (
              <p className="px-3 py-6 text-sm text-text-secondary">No cash or bank accounts for this company.</p>
            ) : filteredAccounts.length === 0 ? (
              <p className="px-3 py-6 text-sm text-text-secondary">No accounts match that search.</p>
            ) : (
              groups.map((group) => (
                <section key={group.kind}>
                  <h2 className="sticky top-0 bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                    {group.label}
                  </h2>
                  <ul>
                    {group.accounts.map((account) => {
                      const current = account.id === selected?.id;
                      return (
                        <li key={account.id}>
                          <a
                            href={account.href}
                            aria-current={current ? "true" : undefined}
                            onClick={(event) => {
                              event.preventDefault();
                              follow(account.href);
                            }}
                            className={clsx(
                              "flex items-start justify-between gap-2 border-l-2 px-3 py-2 text-left",
                              current
                                ? "border-heading bg-surface-elevated font-medium text-heading"
                                : "border-transparent text-foreground hover:bg-background",
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm">{account.name}</span>
                              <span className="block truncate text-[11px] text-text-secondary">
                                {account.kindLabel}
                                {showCompany ? ` · ${account.companyName}` : ""}
                                {account.detail ? ` · ${account.detail}` : ""}
                                {account.active ? "" : " · Inactive"}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs tabular-nums">{account.balance}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </aside>

        <section
          className={clsx(
            "min-w-0 flex-col rounded-lg border border-border bg-surface lg:flex lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
            selected || unavailable ? "flex" : "hidden lg:flex",
          )}
        >
          {selected ? (
            <div className="flex flex-col">
              <div className="border-b border-border px-4 py-3">
                <Link
                  href={listHref}
                  onClick={(event) => {
                    event.preventDefault();
                    follow(listHref);
                  }}
                  className="mb-2 inline-flex text-sm font-medium text-heading lg:hidden"
                >
                  Back to accounts
                </Link>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-heading">{selected.name}</h2>
                    <p className="mt-1 text-xs text-text-secondary">
                      {selected.kindLabel}
                      {showCompany ? ` · ${selected.companyName}` : ""}
                      {selected.active ? "" : " · Inactive"}
                      {selected.ledger ? ` · ${selected.ledger}` : ""}
                    </p>
                    {selected.institution ? (
                      <p className="mt-1 text-sm text-foreground">{selected.institution}</p>
                    ) : null}
                    {selected.accountNumber ? (
                      <p className="text-sm text-foreground">Account {selected.accountNumber}</p>
                    ) : null}
                    <p className="text-sm text-foreground">Currency {selected.currency}</p>
                  </div>
                  <p className="text-base font-semibold tabular-nums text-heading">{selected.balance}</p>
                </div>
              </div>

              <div className="px-4 py-3" onClick={guardLink}>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-heading">Transactions</h3>
                    <p className="text-xs text-text-secondary">{movementNote}</p>
                  </div>
                  <label className="block text-xs font-medium text-text-secondary">
                    Search transactions
                    <input
                      value={transactionQuery}
                      onChange={(event) => setTransactionQuery(event.target.value)}
                      className="mt-1 w-52 max-w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-heading"
                    />
                  </label>
                </div>
                {transactionLimitReached ? (
                  <p className="mb-2 text-xs text-text-secondary">Showing the latest 200 movements in this range.</p>
                ) : null}
                {transactions.length === 0 ? (
                  <p className="py-6 text-sm text-text-secondary">No cash or bank movements in this range.</p>
                ) : filteredTransactions.length === 0 ? (
                  <p className="py-6 text-sm text-text-secondary">No transactions match that search.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-left text-sm text-foreground">
                      <thead className="text-xs text-text-secondary">
                        <tr>
                          {["Date", "Type", "Name", "Reference", "Debit", "Credit", ""].map((header) => (
                            <th key={header || "action"} className="border-b border-border px-2 py-1.5 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((row) => (
                          <tr key={row.id}>
                            <td className="border-b border-border px-2 py-1.5 whitespace-nowrap">{row.date}</td>
                            <td className="border-b border-border px-2 py-1.5">{row.type}</td>
                            <td className="border-b border-border px-2 py-1.5">
                              <span className="block">{row.name}</span>
                              {row.detail ? (
                                <span className="block text-xs text-text-secondary">{row.detail}</span>
                              ) : null}
                            </td>
                            <td className="border-b border-border px-2 py-1.5 whitespace-nowrap">{row.reference}</td>
                            <td className="border-b border-border px-2 py-1.5 text-right whitespace-nowrap tabular-nums">{row.debit}</td>
                            <td className="border-b border-border px-2 py-1.5 text-right whitespace-nowrap tabular-nums">{row.credit}</td>
                            <td className="border-b border-border px-2 py-1.5 text-right">
                              <Link href={row.journalHref} className="text-xs font-medium text-heading">
                                Open journal
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {reconciliations.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-heading">Reconciliations</h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      {reconciliations.map((row) => (
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
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6">
              <Link
                href={listHref}
                onClick={(event) => {
                  event.preventDefault();
                  follow(listHref);
                }}
                className="mb-3 inline-flex text-sm font-medium text-heading lg:hidden"
              >
                Back to accounts
              </Link>
              {unavailable ? (
                <>
                  <h2 className="text-base font-semibold text-heading">Account unavailable</h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    This account is not available for the current company.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-heading">Select an account</h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Choose a bank or cash account to see its details and movements.
                  </p>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function groupAccounts(accounts: BankAccountRow[]) {
  const order = ["bank", "cash"];
  const kinds = [...new Set(accounts.map((account) => account.kind))];
  kinds.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex) || a.localeCompare(b);
  });
  return kinds.map((kind) => ({
    kind,
    label: accounts.find((account) => account.kind === kind)?.kindLabel ?? kind,
    accounts: accounts.filter((account) => account.kind === kind),
  }));
}
