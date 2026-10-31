import Link from "next/link";

import { AccountingFilters } from "@/components/accounting/filters";
import { DocumentTable, Panel } from "@/components/accounting/ui";
import { getDivisionName } from "@/lib/divisions";
import { loadAccountingPage } from "@/lib/accounting/page";
import { listCommercialForAccounting } from "@/lib/accounting/queries";
import { commercialDocumentPath } from "@/lib/operation-documents";
import { formatBhd } from "@/lib/utils";

export default async function AccountingSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const invoices = await listCommercialForAccounting("invoice", page.filter);

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <Panel
        title="Customer invoices"
        aside={
          <Link href="/accounting/start/sale-invoice" className="text-sm font-medium text-heading">
            New sale invoice
          </Link>
        }
      >
        <p className="mb-3 text-sm text-text-secondary">
          A draft invoice does not post. Sending, marking overdue, or marking paid posts accounts receivable and sales revenue once. The operation list at{" "}
          <Link href="/invoice" className="font-medium text-heading">
            /invoice
          </Link>{" "}
          is this same set of documents, opened on the operation. It is not a second invoice. Existing invoices stay on the original posting until a draft is saved with a VAT code. After that, the receivable is the VAT-inclusive total. Cancelling or returning it to draft reverses that journal. A blank due date is not treated as overdue.
        </p>
        <DocumentTable
          rows={invoices.map((invoice) => ({
            id: invoice.id,
            href: invoice.operation
              ? commercialDocumentPath(invoice.operation.id, invoice.id)
              : "/accounting/sales",
            company: getDivisionName(invoice.operation?.divisionId ?? ""),
            reference: invoice.operation?.operationCode ?? "",
            party: invoice.operation?.organization?.name || invoice.operation?.contact?.name || "No customer",
            date: invoice.dueOn ? `${invoice.ledgerDate} · due ${invoice.dueOn}` : invoice.ledgerDate,
            stage: invoice.documentStage ?? "draft",
            amount: formatBhd(invoice.amount) || "",
            journal: invoice.journal,
            outstanding:
              invoice.journal && !invoice.journal.reversed ? invoice.outstanding : null,
          }))}
        />
      </Panel>
    </div>
  );
}

