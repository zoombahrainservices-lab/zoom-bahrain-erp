import Link from "next/link";

import { AddActions } from "@/components/accounting/add-record";
import { AccountingFilters } from "@/components/accounting/filters";
import { PaymentForm } from "@/components/accounting/forms";
import { Panel } from "@/components/accounting/ui";
import { getDivisionName } from "@/lib/divisions";
import { loadAccountingPage } from "@/lib/accounting/page";
import {
  listBankAccounts,
  listCommercialForAccounting,
  listOrganizations,
  listPayments,
} from "@/lib/accounting/queries";
import { paymentViewHref } from "@/lib/accounting/overlap";
import { formatBhd } from "@/lib/utils";

type PaymentSearch = {
  company?: string;
  from?: string;
  to?: string;
  year?: string;
  new?: string;
};

export async function PaymentsBooks({
  searchParams,
  focus = "all",
}: {
  searchParams: Promise<PaymentSearch>;
  focus?: "all" | "in" | "out";
}) {
  const query = await searchParams;
  const page = await loadAccountingPage(query);
  const [payments, invoices, bills, parties, banks] = await Promise.all([
    listPayments(page.filter),
    listCommercialForAccounting("invoice", page.filter),
    listCommercialForAccounting("procurement", page.filter),
    listOrganizations(),
    listBankAccounts(page.filter.companyId),
  ]);

  const partyOptions = parties.map((party) => ({ id: party.id, name: party.name }));
  const bankOptions = banks.map((bank) => ({
    id: bank.id,
    companyId: bank.companyId,
    name: bank.name,
    kind: bank.kind,
  }));

  const openInvoices = invoices
    .filter((invoice) => invoice.journal && !invoice.journal.reversed && invoice.outstanding > 0n)
    .map((invoice) => ({
      id: invoice.id,
      companyId: invoice.operation?.divisionId ?? "",
      label: `${invoice.operation?.operationCode ?? "Invoice"} · ${invoice.operation?.organization?.name ?? "Customer"}`,
    }));
  const openBills = bills
    .filter((bill) => bill.journal && !bill.journal.reversed && bill.outstanding > 0n)
    .map((bill) => ({
      id: bill.id,
      companyId: bill.operation?.divisionId ?? "",
      label: `${bill.operation?.operationCode ?? "Bill"} · ${bill.vendorOrganization?.name ?? "Supplier"}`,
    }));

  const shown = payments.filter((payment) => {
    if (focus === "in") return payment.direction === "receipt";
    if (focus === "out") return payment.direction === "payment";
    return true;
  });
  const receiptAction = {
    label: "Add receipt",
    form: (
      <Panel title="Receive payment">
        <PaymentForm
          companies={page.companies}
          direction="receipt"
          documents={openInvoices}
          parties={partyOptions}
          banks={bankOptions}
        />
      </Panel>
    ),
  };
  const paymentAction = {
    label: "Add payment",
    form: (
      <Panel title="Make supplier payment">
        <PaymentForm
          companies={page.companies}
          direction="payment"
          documents={openBills}
          parties={partyOptions}
          banks={bankOptions}
        />
      </Panel>
    ),
  };
  const actions = focus === "in" ? [receiptAction] : focus === "out" ? [paymentAction] : [receiptAction, paymentAction];
  const title = focus === "in" ? "Payment in" : focus === "out" ? "Payment out" : "Payments and receipts";
  const detail =
    focus === "in"
      ? "Money received from a customer. Pick the open invoice it settles."
      : focus === "out"
        ? "Money paid to a supplier. Pick the open bill it settles."
        : "Money received from customers and money paid to suppliers.";

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <AddActions
        title={title}
        detail={detail}
        count={shown.length}
        initialOpen={query.new === "1" ? 0 : null}
        actions={actions}
      >
      <Panel title="History">
        {shown.length === 0 ? (
          <p className="text-sm text-text-secondary">No payments in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="text-text-secondary">
                <tr>
                  {["Date", "Company", "Type", "Party", "Amount", "Method", "Journal"].map((header) => (
                    <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-border px-3 py-2">{payment.paidOn}</td>
                    <td className="border-b border-border px-3 py-2">{getDivisionName(payment.companyId)}</td>
                    <td className="border-b border-border px-3 py-2">{payment.direction}</td>
                    <td className="border-b border-border px-3 py-2">
                      <Link href={paymentViewHref(payment.direction, payment.id)} className="text-heading">
                        {(payment.organization?.name ?? payment.reference) || "Receipt"}
                      </Link>
                    </td>
                    <td className="border-b border-border px-3 py-2 tabular-nums">{formatBhd(payment.amount)}</td>
                    <td className="border-b border-border px-3 py-2">{payment.method}</td>
                    <td className="border-b border-border px-3 py-2">
                      {payment.journal ? (
                        <Link href={`/accounting/journals/${payment.journal.id}`} className="text-heading">
                          {payment.journal.journalNumber}
                        </Link>
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
    </div>
  );
}

export default function AccountingPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<PaymentSearch>;
}) {
  return <PaymentsBooks searchParams={searchParams} />;
}
