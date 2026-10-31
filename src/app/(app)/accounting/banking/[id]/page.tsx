import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, gte, lte } from "drizzle-orm";

import { BankScreen } from "@/components/accounting/bank-screen";
import { MatchForm, PhaseAction } from "@/components/accounting/phase2-forms";
import { Panel } from "@/components/accounting/ui";
import { db } from "@/db";
import {
  accountingBankAccounts,
  accountingJournalLines,
  accountingReconciliationMatches,
  accountingReconciliations,
  accountingStatementLines,
} from "@/db/schema";
import { accountVisibleForCompany, bankAccountHref } from "@/lib/accounting/bank-labels";
import { filterQuery } from "@/lib/accounting/filters";
import { filsToAmount, toFils } from "@/lib/accounting/money";
import { loadAccountingPage } from "@/lib/accounting/page";

export default async function BankingAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const page = await loadAccountingPage(search);
  const account = await db.query.accountingBankAccounts.findFirst({
    where: eq(accountingBankAccounts.id, id),
  });

  if (account) {
    const access = accountVisibleForCompany(
      account.companyId,
      page.filter.companyId,
      page.companies.map((company) => company.id),
    );
    if (access === "other-company") {
      redirect(bankAccountHref(null, filterQuery(page.filter)));
    }
    if (access === "inaccessible") {
      return <BankScreen page={page} unavailable />;
    }
    return <BankScreen page={page} selectedId={account.id} />;
  }

  const reconciliation = await db.query.accountingReconciliations.findFirst({
    where: eq(accountingReconciliations.id, id),
    with: { bank: true },
  });
  if (!reconciliation) {
    return <BankScreen page={page} unavailable />;
  }
  if (!page.companies.some((company) => company.id === reconciliation.companyId)) {
    notFound();
  }
  return <ReconciliationDetail reconciliation={reconciliation} canPost={page.canPost} />;
}

async function ReconciliationDetail({
  reconciliation,
  canPost,
}: {
  reconciliation: {
    id: string;
    companyId: string;
    bankAccountId: string;
    periodStart: string;
    periodEnd: string;
    statementBalance: string;
    ledgerBalance: string;
    difference: string;
    status: string;
    bank: { id: string; name: string; accountId: string } | null;
  };
  canPost: boolean;
}) {
  const bank = reconciliation.bank;
  const [statementLines, journalLines, matches] = await Promise.all([
    db.query.accountingStatementLines.findMany({
      where: and(
        eq(accountingStatementLines.bankAccountId, reconciliation.bankAccountId),
        gte(accountingStatementLines.lineDate, reconciliation.periodStart),
        lte(accountingStatementLines.lineDate, reconciliation.periodEnd),
      ),
    }),
    bank
      ? db.query.accountingJournalLines.findMany({
          where: eq(accountingJournalLines.accountId, bank.accountId),
          with: { journal: true },
        })
      : Promise.resolve([]),
    db.query.accountingReconciliationMatches.findMany({
      where: eq(accountingReconciliationMatches.reconciliationId, reconciliation.id),
    }),
  ]);
  const matchedStatements = new Set(matches.map((row) => row.statementLineId).filter(Boolean));
  const matchedJournals = new Set(matches.map((row) => row.journalLineId).filter(Boolean));
  const openStatements = statementLines.filter((line) => !matchedStatements.has(line.id));
  const openJournals = journalLines.filter(
    (line) =>
      line.journal?.status === "posted" &&
      !line.journal.reversedById &&
      line.journal.entryDate >= reconciliation.periodStart &&
      line.journal.entryDate <= reconciliation.periodEnd &&
      !matchedJournals.has(line.id),
  );

  return (
    <div className="space-y-6">
      <Panel title={`${bank?.name ?? "Bank"} reconciliation`}>
        <p className="text-sm text-text-secondary">
          {reconciliation.periodStart} to {reconciliation.periodEnd} · {reconciliation.status}. Statement {reconciliation.statementBalance}. Ledger {reconciliation.ledgerBalance}. Difference {reconciliation.difference}. Cleared lines are matches. They are separate from whether a journal is posted.
        </p>
        <p className="mt-2 text-sm text-foreground">
          Unmatched statement lines {openStatements.length}. Unmatched ledger lines {openJournals.length}.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {canPost && reconciliation.status === "open" ? (
            <PhaseAction action="completeReconciliation" id={reconciliation.id} label="Lock reconciliation" />
          ) : null}
          {canPost && reconciliation.status === "completed" ? (
            <PhaseAction action="reopenReconciliation" id={reconciliation.id} label="Reopen" />
          ) : null}
          <Link href={bankAccountHref(bank?.id ?? null, "")} className="text-sm font-medium text-heading">
            Back to account
          </Link>
        </div>
      </Panel>
      {reconciliation.status === "open" ? (
        <Panel title="Match">
          <MatchForm
            reconciliationId={reconciliation.id}
            statementLines={openStatements.map((line) => ({
              id: line.id,
              label: `${line.lineDate} ${line.amount} ${line.reference} ${line.description}`,
            }))}
            journalLines={openJournals.map((line) => ({
              id: line.id,
              label: `${line.journal?.entryDate ?? ""} ${line.journal?.journalNumber ?? ""} ${filsToAmount(toFils(line.debit) - toFils(line.credit))} ${line.description}`,
            }))}
          />
        </Panel>
      ) : null}
    </div>
  );
}
