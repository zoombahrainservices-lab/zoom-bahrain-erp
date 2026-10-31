import { JournalForm } from "@/components/accounting/forms";
import { Panel } from "@/components/accounting/ui";
import { loadAccountingPage } from "@/lib/accounting/page";
import { listAccounts } from "@/lib/accounting/queries";

export default async function NewJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const accounts = await listAccounts("all");

  return (
    <Panel title="New journal entry">
      <JournalForm
        companies={page.companies}
        canPost={page.canPost}
        initial={
          page.filter.companyId === "all"
            ? undefined
            : {
                companyId: page.filter.companyId,
                entryDate: page.filter.to,
                description: "",
                lines: [
                  { accountId: "", description: "", debit: "", credit: "" },
                  { accountId: "", description: "", debit: "", credit: "" },
                ],
              }
        }
        accounts={accounts.map((account) => ({
          id: account.id,
          companyId: account.companyId,
          code: account.code,
          name: account.name,
          accountType: account.accountType,
        }))}
      />
    </Panel>
  );
}
