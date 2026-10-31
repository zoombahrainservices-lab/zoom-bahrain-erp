import { AccountingError, filsToAmount } from "./money";

/**
 * Decision log for overlapping workflows.
 *
 * Invoices: /accounting/sales and /invoice are two views of operation entry
 * type invoice. One journal source (invoice + entry id). Sale Invoices is the
 * sidebar entry. /invoice stays as the operation-document list.
 *
 * Purchase order: a slip. It does not post.
 * Procurement receipt: Dr 5600 Purchases, Cr 2000 Accounts Payable.
 * Account 2300 Accrued Expenses is on the chart and is not used. There is no
 * accrual to clear. A linked supplier bill records the supplier invoice. When
 * the receipt journal is already open and the company, supplier, currency, and
 * amount match, the bill uses that payable and does not post another journal.
 * A difference stops the post and changes nothing. A bill with no open receipt
 * journal is the recognition. One non-reversed bill per procurement. Partial
 * payments stay allowed. Credit notes stay a separate adjustment.
 *
 * Cost notes are operation records. They do not post on their own. An expense
 * and a cost note share one recognition only when the expense stores that
 * cost-note id. Other costs on the same operation stay separate.
 *
 * Payments: one accounting_payments row. Direction views are filters.
 * A repeated request uses the same payment id. A smaller amount against a
 * remaining balance is a partial payment.
 *
 * Stock: stock documents are the quantity write path. accounting_items remains
 * the legacy balance. The two are not added together and are not force-matched.
 */

export const PURCHASE_ACCOUNTS = {
  procurementDebit: "5600",
  procurementCredit: "2000",
  accruedExpenses: "2300",
  usesClearingAccount: false,
} as const;

export class RecognitionOverlapError extends AccountingError {
  readonly companyId: string;
  readonly sourceId: string;

  constructor(message: string, companyId: string, sourceId: string) {
    super(message);
    this.name = "RecognitionOverlapError";
    this.companyId = companyId;
    this.sourceId = sourceId;
  }
}

export type LinkedBillState =
  | "none"
  | "draft"
  | "approved"
  | "posted"
  | "partial"
  | "paid"
  | "reversed";

const recognisedBill = new Set<LinkedBillState>(["posted", "partial", "paid"]);

export function invoiceLedgerSource(entryId: string) {
  return { sourceType: "invoice" as const, sourceId: entryId };
}

export function procurementPostDecision(input: {
  linkedBillState: LinkedBillState;
  linkedBillHasOpenJournal: boolean;
  billNumber?: string | null;
}) {
  const recognised =
    input.linkedBillState !== "reversed" &&
    (recognisedBill.has(input.linkedBillState) || input.linkedBillHasOpenJournal);
  if (!recognised) return { post: true as const };
  const bill = input.billNumber ? `Supplier bill ${input.billNumber}` : "A linked supplier bill";
  return {
    post: false as const,
    message: `${bill} already recognised this purchase. Receiving the procurement was saved, and a second journal was not posted. Pay that bill to settle the payable.`,
  };
}

export type OpenPurchaseJournal = {
  id: string;
  number: string;
  companyId: string;
  supplierOrganizationId: string | null;
  currency: string;
  payableAmount: bigint;
};

export function linkedPurchaseDecision(input: {
  procurementEntryId: string | null;
  journal: OpenPurchaseJournal | null;
  billCompanyId: string;
  billSupplierOrganizationId: string | null;
  billCurrency: string;
  billTotal: bigint;
}) {
  if (!input.procurementEntryId || !input.journal) return { action: "post-own" as const };
  const journal = input.journal;
  const issues: string[] = [];
  if (journal.companyId !== input.billCompanyId) {
    issues.push(`company (${journal.companyId} on the receipt, ${input.billCompanyId} on the bill)`);
  }
  if (!journal.supplierOrganizationId || journal.supplierOrganizationId !== input.billSupplierOrganizationId) {
    issues.push("supplier");
  }
  if (journal.currency !== input.billCurrency) {
    issues.push(`currency (${journal.currency} on the receipt, ${input.billCurrency} on the bill)`);
  }
  if (journal.payableAmount !== input.billTotal) {
    issues.push(
      `amount (${filsToAmount(journal.payableAmount)} ${journal.currency} on the receipt, ${filsToAmount(input.billTotal)} ${input.billCurrency} on the bill)`,
    );
  }
  if (issues.length > 0) {
    return {
      action: "hold" as const,
      message: `This supplier invoice was not posted. Procurement journal ${journal.number} already recognised the purchase, and the ${issues.join("; ")} do not match. Resolve the difference. Nothing was overwritten or balanced. One non-reversed bill per procurement.`,
    };
  }
  return {
    action: "adopt" as const,
    journalId: journal.id,
    message: `Supplier invoice recorded against procurement journal ${journal.number}. The liability stays on Purchases (5600) and Accounts Payable (2000). No second payable was created. Pay this bill to settle that liability. One bill per procurement.`,
  };
}

export function supplierInvoicePreview(input: {
  status: string;
  procurementEntryId: string | null;
  journal: OpenPurchaseJournal | null;
  billCompanyId: string;
  billSupplierOrganizationId: string | null;
  billCurrency: string;
  billTotal: bigint;
  postedJournal: { sourceType: string; number: string; reversed: boolean } | null;
}) {
  if (!input.procurementEntryId) {
    return "This is a standalone supplier bill. Saving stores the invoice and does not post. Posting recognises the expense and accounts payable.";
  }
  const posted = input.postedJournal;
  if (["posted", "partial", "paid"].includes(input.status)) {
    if (posted?.sourceType === "procurement" && !posted.reversed) {
      return `The liability was recognised on procurement journal ${posted.number} (Purchases 5600 and Accounts Payable 2000). This invoice does not add a second payable. Payments on this bill settle that liability. One bill per procurement.`;
    }
    if (posted?.sourceType === "supplier_bill" && !posted.reversed) {
      return `This bill recognised the liability on journal ${posted.number}. The linked procurement is not posted again. Pay this bill to settle it.`;
    }
    if (posted?.reversed) {
      return `Journal ${posted.number} has been reversed. This bill is not an open payable.`;
    }
  }
  if (input.status === "reversed" && posted?.sourceType === "procurement") {
    return `This supplier invoice was reversed. Procurement journal ${posted.number} remains the payable while it is still open.`;
  }
  const decision = linkedPurchaseDecision({
    procurementEntryId: input.procurementEntryId,
    journal: input.journal,
    billCompanyId: input.billCompanyId,
    billSupplierOrganizationId: input.billSupplierOrganizationId,
    billCurrency: input.billCurrency,
    billTotal: input.billTotal,
  });
  if (decision.action === "hold") return decision.message;
  if (decision.action === "adopt") {
    return `Post records this invoice against procurement journal ${input.journal?.number} and does not create a second payable. Supplier, company, currency, and amount match. Saving the invoice does not post by itself.`;
  }
  return "The linked procurement has no open payable. Posting this bill recognises the expense and accounts payable. Receiving the procurement afterwards does not post a second journal. Saving the invoice does not post by itself.";
}

export function costRecognitionDecision(input: {
  intent: "expense" | "operation_cost";
  linkedEntryId: string | null;
  openExpenseJournal: boolean;
  openCostJournal: boolean;
}) {
  if (!input.linkedEntryId) return { post: true as const };
  if (input.intent === "expense" && input.openCostJournal) {
    return {
      post: false as const,
      message:
        "This cost note is already in the ledger. The expense was not posted, so the cost is not recognised twice.",
    };
  }
  if (input.intent === "operation_cost" && input.openExpenseJournal) {
    return {
      post: false as const,
      message:
        "An expense linked to this cost note is already posted. The cost was not posted again.",
    };
  }
  if (input.intent === "operation_cost" && input.openCostJournal) {
    return {
      post: false as const,
      message: "This cost is already in the ledger.",
    };
  }
  return { post: true as const };
}

export function paymentRetryDecision(input: {
  existing: {
    companyId: string;
    direction: string;
    documentId: string | null;
    amount: bigint;
    journalOpen: boolean;
  } | null;
  request: {
    companyId: string;
    direction: string;
    documentId: string | null;
    amount: bigint;
  };
}) {
  if (!input.existing) return { action: "continue" as const };
  const sameCompany = input.existing.companyId === input.request.companyId;
  const sameDirection = input.existing.direction === input.request.direction;
  const sameDocument = (input.existing.documentId ?? null) === (input.request.documentId ?? null);
  const sameAmount = input.existing.amount === input.request.amount;
  if (!sameCompany || !sameDirection || !sameDocument || !sameAmount) {
    return {
      action: "refuse" as const,
      message:
        "This payment key was already used for a different company, document, direction, or amount. Nothing new was posted.",
    };
  }
  if (!input.existing.journalOpen) {
    return {
      action: "refuse" as const,
      message:
        "This payment key belongs to a reversed settlement. It was not posted again. Use a new payment.",
    };
  }
  return { action: "return-existing" as const };
}

export function settlementDecision(input: {
  idempotencyKey: string | null;
  existingPaymentForKey: boolean;
  keyBelongsToThisSettlement: boolean;
  outstanding: bigint | null;
  amount: bigint;
}) {
  if (input.idempotencyKey && input.existingPaymentForKey) {
    if (!input.keyBelongsToThisSettlement) {
      return {
        action: "refuse" as const,
        message: "This payment key was already used for a different settlement. Nothing new was posted.",
      };
    }
    return { action: "return-existing" as const };
  }
  if (input.amount <= 0n) {
    return { action: "refuse" as const, message: "Enter a payment amount" };
  }
  if (input.outstanding === null) return { action: "post" as const };
  if (input.outstanding <= 0n) {
    return {
      action: "refuse" as const,
      message: "This document has no outstanding ledger balance. A second payment was not posted.",
    };
  }
  if (input.amount > input.outstanding) {
    return {
      action: "refuse" as const,
      message: `Amount is above the outstanding balance of ${input.outstanding.toString()} fils. The payment was not posted.`,
    };
  }
  return { action: "post" as const };
}

export function bankMovementDecision(input: { settlementPaymentId: string | null }) {
  if (!input.settlementPaymentId) return { post: true as const };
  return {
    post: false as const,
    message: `Payment ${input.settlementPaymentId} already records this settlement. The bank movement was not posted, so the cash or bank account is not moved a second time.`,
  };
}

export function paymentViewHref(direction: "receipt" | "payment", id: string) {
  return direction === "receipt" ? `/accounting/receipts/${id}` : `/accounting/payouts/${id}`;
}

export function repostAfterReversal(input: { originalReversed: boolean; revisionIsNewSource: boolean }) {
  return input.originalReversed && input.revisionIsNewSource;
}
