import { notFound } from "next/navigation";
import { and, eq, isNull, or, sql } from "drizzle-orm";

import { AttachmentForm, PayBillForm, PhaseAction } from "@/components/accounting/phase2-forms";
import { Panel } from "@/components/accounting/ui";
import { db } from "@/db";
import { accountingAttachments, accountingBills, accountingJournals, accountingPayments } from "@/db/schema";
import { loadBillSettlement } from "@/lib/accounting/phase2";
import { supplierInvoicePreview } from "@/lib/accounting/overlap";
import { loadAccountingPage } from "@/lib/accounting/page";
import { listBankAccounts } from "@/lib/accounting/queries";
import { filsToAmount, toFils } from "@/lib/accounting/money";
import { canProcessPayments } from "@/lib/permissions";

export default async function BillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await loadAccountingPage({});
  const bill = await db.query.accountingBills.findFirst({
    where: eq(accountingBills.id, id),
    with: { supplier: true, lines: { with: { account: true, vatCode: true } } },
  });
  if (!bill) notFound();
  const [payments, files, banks, credits, postedJournal, openReceipt] = await Promise.all([
    db.query.accountingPayments.findMany({
      where: bill.procurementEntryId
        ? or(eq(accountingPayments.billId, bill.id), and(eq(accountingPayments.operationEntryId, bill.procurementEntryId), isNull(accountingPayments.billId)))
        : eq(accountingPayments.billId, bill.id),
      with: { journal: true },
    }),
    db.query.accountingAttachments.findMany({
      where: eq(accountingAttachments.entityId, bill.id),
    }),
    listBankAccounts(bill.companyId),
    db.query.accountingBills.findMany({
      where: eq(accountingBills.creditOfBillId, bill.id),
    }),
    bill.journalId
      ? db.query.accountingJournals.findFirst({ where: eq(accountingJournals.id, bill.journalId) })
      : Promise.resolve(null),
    bill.procurementEntryId
      ? db.query.accountingJournals.findFirst({
          where: and(
            eq(accountingJournals.sourceType, "procurement"),
            eq(accountingJournals.sourceId, bill.procurementEntryId),
            eq(accountingJournals.status, "posted"),
            sql`${accountingJournals.reversalOfId} IS NULL`,
            sql`${accountingJournals.reversedById} IS NULL`,
          ),
          with: { lines: { with: { account: true } } },
        })
      : Promise.resolve(null),
  ]);
  const settlement = await loadBillSettlement(bill.id);
  const paid = settlement?.paid ?? 0n;
  const credited = settlement?.credits ?? credits
    .filter((credit) => ["posted", "partial", "paid"].includes(credit.status))
    .reduce((sum, credit) => sum + toFils(credit.total), 0n);
  const outstanding = settlement?.outstanding ?? 0n;
  const payableAmount = (openReceipt?.lines ?? []).reduce((sum, line) => {
    if (line.account?.code !== "2000") return sum;
    return sum + toFils(line.credit) - toFils(line.debit);
  }, 0n);
  const recognition = supplierInvoicePreview({
    status: bill.status,
    procurementEntryId: bill.procurementEntryId,
    journal: openReceipt
      ? {
          id: openReceipt.id,
          number: openReceipt.journalNumber,
          companyId: openReceipt.companyId,
          supplierOrganizationId: openReceipt.organizationId,
          currency: openReceipt.currency,
          payableAmount,
        }
      : null,
    billCompanyId: bill.companyId,
    billSupplierOrganizationId: bill.supplierOrganizationId,
    billCurrency: bill.currency,
    billTotal: toFils(bill.total),
    postedJournal: postedJournal
      ? {
          sourceType: postedJournal.sourceType,
          number: postedJournal.journalNumber,
          reversed: Boolean(postedJournal.reversedById),
        }
      : null,
  });

  return (
    <div className="space-y-6">
      <Panel
        title={`${bill.billNumber}`}
        aside={
          <a href={`/api/accounting/pdf?kind=bill&id=${bill.id}`} className="text-sm font-medium text-heading">
            Download PDF
          </a>
        }
      >
        <p className="text-sm text-text-secondary">
          {bill.supplier?.name ?? "No supplier"} · {bill.billDate} · due {bill.dueDate} · {bill.status} · {bill.currency}
          {bill.reference ? ` · ${bill.reference}` : ""}
        </p>
        <p className="mt-2 text-sm text-foreground">{recognition}</p>
        {postedJournal ? (
          <p className="mt-2 text-sm text-foreground">
            Journal <a className="font-medium text-heading" href={`/accounting/journals/${postedJournal.id}`}>{postedJournal.journalNumber}</a>
            {postedJournal.reversedById ? " (reversed)" : ""}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-foreground">
          Total {bill.total} · Paid {filsToAmount(paid)} · Credits {filsToAmount(credited)} · Outstanding {filsToAmount(outstanding)}
        </p>
        <table className="mt-4 min-w-full text-left text-sm text-foreground">
          <thead className="text-text-secondary">
            <tr>
              {["Description", "Qty", "Price", "Discount", "Net", "VAT", "Total", "Account"].map((header) => (
                <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bill.lines.map((line) => (
              <tr key={line.id}>
                <td className="border-b border-border px-3 py-2">{line.description}</td>
                <td className="border-b border-border px-3 py-2 tabular-nums">{line.quantity}</td>
                <td className="border-b border-border px-3 py-2 tabular-nums">{line.unitAmount}</td>
                <td className="border-b border-border px-3 py-2 tabular-nums">{line.discount}</td>
                <td className="border-b border-border px-3 py-2 tabular-nums">{line.netAmount}</td>
                <td className="border-b border-border px-3 py-2 tabular-nums">{line.vatAmount} {line.vatCode?.code ?? ""}</td>
                <td className="border-b border-border px-3 py-2 tabular-nums">{line.lineTotal}</td>
                <td className="border-b border-border px-3 py-2">{line.account?.code} {line.account?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-2">
          {page.canPost && bill.status === "draft" ? <PhaseAction action="approveBill" id={bill.id} label="Approve" /> : null}
          {page.canPost && bill.status === "approved" ? (
            <PhaseAction action="postBill" id={bill.id} label={bill.procurementEntryId ? "Record invoice" : "Post"} />
          ) : null}
          {page.canPost && bill.journalId && bill.status !== "reversed" ? <PhaseAction action="reverseBill" id={bill.id} label="Reverse" /> : null}
        </div>
      </Panel>
      {canProcessPayments(page.session) && ["posted", "partial"].includes(bill.status) ? (
        <Panel title="Pay supplier">
          <PayBillForm
            billId={bill.id}
            banks={banks.map((bank) => ({ id: bank.id, companyId: bank.companyId, name: bank.name }))}
          />
        </Panel>
      ) : null}
      {payments.length > 0 ? (
        <Panel title="Settlements">
          <ul className="space-y-1 text-sm text-foreground">
            {payments.map((payment) => (
              <li key={payment.id}>
                <a className="font-medium text-heading" href={payment.direction === "receipt" ? `/accounting/receipts/${payment.id}` : `/accounting/payouts/${payment.id}`}>
                  {payment.paidOn} · {payment.amount}
                </a>
                {payment.journal?.reversedById ? " · reversed" : payment.billId ? " · paid on this bill" : " · paid on the procurement"}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <Panel title="Supplier invoice file">
        <AttachmentForm companyId={bill.companyId} entityType="bill" entityId={bill.id} />
        <ul className="mt-3 space-y-1 text-sm">
          {files.map((file) => (
            <li key={file.id}>
              <a href={`/api/accounting/attachments?id=${file.id}`} className="text-heading">{file.fileName}</a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
