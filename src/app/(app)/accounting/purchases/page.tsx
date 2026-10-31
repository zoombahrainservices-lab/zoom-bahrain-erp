import { AddActions } from "@/components/accounting/add-record";
import { AccountingFilters } from "@/components/accounting/filters";
import { ExpenseForm } from "@/components/accounting/forms";
import { BillForm, PhaseAction } from "@/components/accounting/phase2-forms";
import { DocumentTable, Panel } from "@/components/accounting/ui";
import { getDivisionName } from "@/lib/divisions";
import { loadAccountingPage } from "@/lib/accounting/page";
import { listBills, listExpenses } from "@/lib/accounting/phase2";
import {
  listAccounts,
  listBankAccounts,
  listCommercialForAccounting,
  listOrganizations,
  listVatCodes,
} from "@/lib/accounting/queries";
import { loadCostExpenseLinks } from "@/lib/accounting/overlap-diagnostic";
import { listActiveOperations } from "@/lib/list-work-desk";
import { commercialDocumentPath } from "@/lib/operation-documents";
import { formatBhd } from "@/lib/utils";

type PurchaseSearch = {
  company?: string;
  from?: string;
  to?: string;
  year?: string;
  new?: string;
};

export async function PurchasesBooks({
  searchParams,
  section,
}: {
  searchParams: Promise<PurchaseSearch>;
  section?: "expenses";
}) {
  const query = await searchParams;
  const page = await loadAccountingPage(query);
  const [bills, costs, accounts, parties, banks, vatCodes, operations, supplierBills, expenses, costLinks] =
    await Promise.all([
    listCommercialForAccounting("procurement", page.filter),
    listCommercialForAccounting("cost", page.filter),
    listAccounts(page.filter.companyId),
    listOrganizations(),
    listBankAccounts(page.filter.companyId),
    listVatCodes(page.filter.companyId),
    listActiveOperations(),
    listBills(page.filter.companyId),
    listExpenses(page.filter.companyId),
    loadCostExpenseLinks(),
  ]);

  return (
    <div className="space-y-10">
      <AccountingFilters filter={page.filter} companies={page.companies} />

      {section === "expenses" ? null : (
      <AddActions
        title="Supplier bills"
        detail="Saving a supplier bill stores the invoice and does not post. A standalone bill posts its own payable. A bill linked to a receipt uses that receipt's payable when the supplier, company, currency, and amount match, and does not post a second one. One non-reversed bill per procurement."
        count={supplierBills.length}
        initialOpen={query.new === "bill" ? 0 : null}
        actions={[
          {
            label: "Add bill",
            form: (
              <Panel title="New bill">
                <BillForm
                  companies={page.companies}
                  accounts={accounts.map(accountOption)}
                  parties={parties.map((party) => ({ id: party.id, name: party.name }))}
                  vatCodes={vatCodes.map((code) => ({
                    id: code.id,
                    companyId: code.companyId,
                    code: code.code,
                    name: code.name,
                  }))}
                  operations={operations.map((operation) => ({
                    id: operation.id,
                    companyId: operation.divisionId,
                    label: `${operation.operationCode} ${operation.title}`.trim(),
                  }))}
                />
              </Panel>
            ),
          },
        ]}
      >
        <Panel>
          {supplierBills.length === 0 ? (
            <p className="text-sm text-text-secondary">No supplier bills in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-foreground">
                <thead className="text-text-secondary">
                  <tr>
                    {["Number", "Supplier", "Date", "Total", "Status", ""].map((header) => (
                      <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supplierBills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="border-b border-border px-3 py-2">
                        <a href={`/accounting/purchases/bills/${bill.id}`} className="font-medium text-heading">{bill.billNumber}</a>
                      </td>
                      <td className="border-b border-border px-3 py-2">{bill.supplier?.name ?? "—"}</td>
                      <td className="border-b border-border px-3 py-2">{bill.billDate}</td>
                      <td className="border-b border-border px-3 py-2 tabular-nums">{bill.total} {bill.currency}</td>
                      <td className="border-b border-border px-3 py-2 capitalize">
                        {bill.status}
                        {bill.procurementEntryId ? <span className="block text-text-secondary">One bill for this procurement</span> : null}
                      </td>
                      <td className="border-b border-border px-3 py-2">
                        {page.canPost && bill.status === "draft" ? <PhaseAction action="approveBill" id={bill.id} label="Approve" /> : null}
                        {page.canPost && bill.status === "approved" ? (
                          <PhaseAction action="postBill" id={bill.id} label={bill.procurementEntryId ? "Record invoice" : "Post"} />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </AddActions>
      )}

      <AddActions
        title="Expenses"
        detail="One amount, one category. Card payments use card clearing. A foreign currency uses the rate on the form."
        count={expenses.length}
        initialOpen={query.new === "1" || query.new === "expense" ? 0 : null}
        actions={[
          {
            label: "Add expense",
            form: (
              <Panel title="New expense">
                <ExpenseForm
                  companies={page.companies}
                  accounts={accounts.map(accountOption)}
                  parties={parties.map((party) => ({ id: party.id, name: party.name }))}
                  banks={banks.map((bank) => ({
                    id: bank.id,
                    companyId: bank.companyId,
                    name: bank.name,
                    kind: bank.kind,
                  }))}
                  vatCodes={vatCodes.map((code) => ({
                    id: code.id,
                    companyId: code.companyId,
                    code: code.code,
                    name: code.name,
                  }))}
                  operations={operations.map((operation) => ({
                    id: operation.id,
                    companyId: operation.divisionId,
                    label: `${operation.operationCode} ${operation.title}`.trim(),
                  }))}
                  costNotes={costs.flatMap((cost) =>
                    cost.operation
                      ? [{
                          id: cost.id,
                          operationId: cost.operation.id,
                          companyId: cost.operation.divisionId,
                          label: `${cost.operation.operationCode} · ${formatBhd(cost.amount) || "no amount"}`,
                        }]
                      : [],
                  )}
                />
              </Panel>
            ),
          },
        ]}
      >
        <Panel>
          {expenses.length === 0 ? (
            <p className="text-sm text-text-secondary">No expenses in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-foreground">
                <thead className="text-text-secondary">
                  <tr>
                    {["Number", "Date", "Category", "Total", "Status", ""].map((header) => (
                      <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="border-b border-border px-3 py-2">
                        <a href={`/api/accounting/pdf?kind=expense&id=${expense.id}`} className="font-medium text-heading">{expense.expenseNumber}</a>
                      </td>
                      <td className="border-b border-border px-3 py-2">{expense.expenseDate}</td>
                      <td className="border-b border-border px-3 py-2">
                        {expense.account?.name ?? "—"}
                        {costLinks.some((link) => link.expenseId === expense.id) ? (
                          <span className="block text-text-secondary">
                            Linked cost note {costLinks.find((link) => link.expenseId === expense.id)?.operationCode}
                          </span>
                        ) : null}
                      </td>
                      <td className="border-b border-border px-3 py-2 tabular-nums">{expense.totalAmount} {expense.currency}</td>
                      <td className="border-b border-border px-3 py-2 capitalize">{expense.status}</td>
                      <td className="border-b border-border px-3 py-2">
                        {page.canPost && expense.status === "draft" ? <PhaseAction action="approveExpense" id={expense.id} label="Approve" /> : null}
                        {page.canPost && expense.status === "approved" ? <PhaseAction action="postExpense" id={expense.id} label="Post" /> : null}
                        {page.canPost && expense.status === "posted" ? <PhaseAction action="reverseExpense" id={expense.id} label="Reverse" /> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </AddActions>

      {section === "expenses" ? null : (
      <section className="space-y-3">
        <SectionHeading
          title="From operations"
          detail="A purchase order is a commitment and does not post. Receiving a procurement posts Purchases (5600) and Accounts Payable (2000). A supplier bill can record the invoice against that payable, or post its own if the receipt has not. The same purchase is not recognised twice. Account 2300 is not a clearing account."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Purchase requests">
            <DocumentTable
              rows={bills.map((bill) => ({
                id: bill.id,
                href: bill.operation ? commercialDocumentPath(bill.operation.id, bill.id) : "/accounting/purchases",
                company: getDivisionName(bill.operation?.divisionId ?? ""),
                reference: bill.operation?.operationCode ?? "",
                party: bill.vendorOrganization?.name || "No supplier",
                date: bill.ledgerDate,
                stage: bill.documentStage ?? "draft",
                amount: formatBhd(bill.amount) || "",
                journal: bill.journal,
                outstanding: bill.journal && !bill.journal.reversed ? bill.outstanding : null,
              }))}
            />
          </Panel>
          <Panel title="Cost notes">
            <p className="mb-3 text-sm text-text-secondary">
              A cost note is an operation record. It does not post by itself. Link an expense to that note when the note is the actual cost, and only one of them will post. Another cost on the same operation stays separate.
            </p>
            <DocumentTable
              rows={costs.map((cost) => ({
                id: cost.id,
                href: cost.operation ? `/operations/${cost.operation.id}` : "/accounting/purchases",
                company: getDivisionName(cost.operation?.divisionId ?? ""),
                reference: cost.operation?.operationCode ?? "",
                party: cost.operation?.organization?.name || cost.vendorOrganization?.name || "—",
                date: cost.ledgerDate,
                stage: costLinks.some((link) => link.entryId === cost.id)
                  ? `Linked expense ${costLinks.find((link) => link.entryId === cost.id)?.expenseNumber}`
                  : (cost.documentStage ?? "note"),
                amount: formatBhd(cost.amount) || "",
                journal: cost.journal,
                outstanding: cost.journal && !cost.journal.reversed ? cost.outstanding : null,
              }))}
            />
          </Panel>
        </div>
      </section>
      )}
    </div>
  );
}

export default function AccountingPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<PurchaseSearch>;
}) {
  return <PurchasesBooks searchParams={searchParams} />;
}

function SectionHeading({
  title,
  detail,
  count,
}: {
  title: string;
  detail: string;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold text-heading">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">{detail}</p>
      </div>
      {count !== undefined ? (
        <p className="text-sm tabular-nums text-text-secondary">{count}</p>
      ) : null}
    </div>
  );
}

function accountOption(account: {
  id: string;
  companyId: string;
  code: string;
  name: string;
  accountType: string;
}) {
  return {
    id: account.id,
    companyId: account.companyId,
    code: account.code,
    name: account.name,
    accountType: account.accountType,
  };
}
