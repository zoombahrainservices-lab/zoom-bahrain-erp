import Link from "next/link";
import { notFound } from "next/navigation";

import { JournalActions, JournalForm } from "@/components/accounting/forms";
import { Panel } from "@/components/accounting/ui";
import { getJournal, listAccounts } from "@/lib/accounting/queries";
import { getDivisionName } from "@/lib/divisions";
import { loadAccountingPage } from "@/lib/accounting/page";
import { formatBhd } from "@/lib/utils";

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await loadAccountingPage({});
  const journal = await getJournal(id);
  if (!journal) notFound();

  const accounts = journal.status === "draft" ? await listAccounts(journal.companyId) : [];

  return (
    <div className="space-y-4">
      <Panel title={`${journal.journalNumber} · ${journal.status}`}>
        <p className="text-sm text-text-secondary">
          {getDivisionName(journal.companyId)} · {journal.entryDate} · {journal.sourceType}
          {journal.reversedById ? " · reversed" : ""}
        </p>
        <p className="mt-2 text-foreground">{journal.description}</p>
        {journal.operationId ? (
          <p className="mt-2 text-sm">
            <Link href={`/operations/${journal.operationId}`} className="text-heading">
              Open operation
            </Link>
          </p>
        ) : null}
        <div className="mt-4">
          <JournalActions
            journalId={journal.id}
            status={journal.status}
            reversed={Boolean(journal.reversedById)}
            canPost={page.canPost}
          />
        </div>
      </Panel>
      {journal.status === "draft" ? (
        <Panel title="Edit draft">
          <JournalForm
            journalId={journal.id}
            companies={page.companies.filter((company) => company.id === journal.companyId)}
            canPost={page.canPost}
            accounts={accounts.map((account) => ({
              id: account.id,
              companyId: account.companyId,
              code: account.code,
              name: account.name,
              accountType: account.accountType,
            }))}
            initial={{
              companyId: journal.companyId,
              entryDate: journal.entryDate,
              description: journal.description,
              lines: journal.lines.map((line) => ({
                accountId: line.accountId,
                description: line.description,
                debit: line.debit,
                credit: line.credit,
              })),
            }}
          />
        </Panel>
      ) : (
        <Panel title="Lines">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="text-text-secondary">
              <tr>
                {["Account", "Party", "Detail", "Debit", "Credit"].map((header) => (
                  <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {journal.lines.map((line) => (
                <tr key={line.id}>
                  <td className="border-b border-border px-3 py-2">{line.account?.code} {line.account?.name}</td>
                  <td className="border-b border-border px-3 py-2">{line.organization?.name ?? ""}</td>
                  <td className="border-b border-border px-3 py-2">{line.description}</td>
                  <td className="border-b border-border px-3 py-2 tabular-nums">{formatBhd(line.debit)}</td>
                  <td className="border-b border-border px-3 py-2 tabular-nums">{formatBhd(line.credit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
