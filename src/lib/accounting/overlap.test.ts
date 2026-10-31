import assert from "node:assert/strict";
import test from "node:test";

import { filsToAmount, toFils } from "./money";
import {
  PURCHASE_ACCOUNTS,
  bankMovementDecision,
  costRecognitionDecision,
  invoiceLedgerSource,
  paymentViewHref,
  linkedPurchaseDecision,
  paymentRetryDecision,
  procurementPostDecision,
  repostAfterReversal,
  settlementDecision,
  supplierInvoicePreview,
} from "./overlap";

test("both invoice views share one ledger source", () => {
  const sales = invoiceLedgerSource("entry-1");
  const operationList = invoiceLedgerSource("entry-1");
  assert.deepEqual(sales, operationList);
  assert.equal(sales.sourceType, "invoice");
  assert.notEqual(invoiceLedgerSource("entry-1").sourceId, invoiceLedgerSource("entry-2").sourceId);
});

const receipt = {
  id: "journal-1",
  number: "JNL-00009",
  companyId: "events",
  supplierOrganizationId: "supplier-1",
  currency: "BHD",
  payableAmount: toFils("25.000"),
};

test("a matching supplier invoice uses the receipt payable and a difference does not post", () => {
  assert.equal(
    linkedPurchaseDecision({
      procurementEntryId: null,
      journal: null,
      billCompanyId: "events",
      billSupplierOrganizationId: "supplier-1",
      billCurrency: "BHD",
      billTotal: toFils("25.000"),
    }).action,
    "post-own",
  );
  assert.equal(
    linkedPurchaseDecision({
      procurementEntryId: "proc-1",
      journal: null,
      billCompanyId: "events",
      billSupplierOrganizationId: "supplier-1",
      billCurrency: "BHD",
      billTotal: toFils("25.000"),
    }).action,
    "post-own",
  );
  const adopted = linkedPurchaseDecision({
    procurementEntryId: "proc-1",
    journal: receipt,
    billCompanyId: "events",
    billSupplierOrganizationId: "supplier-1",
    billCurrency: "BHD",
    billTotal: toFils("25.000"),
  });
  assert.equal(adopted.action, "adopt");
  if (adopted.action === "adopt") {
    assert.equal(adopted.journalId, "journal-1");
    assert.match(adopted.message, /No second payable/);
  }
  for (const bill of [
    { billCompanyId: "advertising", billSupplierOrganizationId: "supplier-1", billCurrency: "BHD", billTotal: toFils("25.000") },
    { billCompanyId: "events", billSupplierOrganizationId: "supplier-2", billCurrency: "BHD", billTotal: toFils("25.000") },
    { billCompanyId: "events", billSupplierOrganizationId: "supplier-1", billCurrency: "USD", billTotal: toFils("25.000") },
    { billCompanyId: "events", billSupplierOrganizationId: "supplier-1", billCurrency: "BHD", billTotal: toFils("30.000") },
  ]) {
    const held = linkedPurchaseDecision({ procurementEntryId: "proc-1", journal: receipt, ...bill });
    assert.equal(held.action, "hold");
    if (held.action === "hold") assert.match(held.message, /Nothing was overwritten/);
  }
  assert.equal(PURCHASE_ACCOUNTS.usesClearingAccount, false);
  assert.equal(PURCHASE_ACCOUNTS.accruedExpenses, "2300");
});

test("both purchase sequences stay visible on the invoice", () => {
  const preview = supplierInvoicePreview({
    status: "approved",
    procurementEntryId: "proc-1",
    journal: receipt,
    billCompanyId: "events",
    billSupplierOrganizationId: "supplier-1",
    billCurrency: "BHD",
    billTotal: toFils("25.000"),
    postedJournal: null,
  });
  assert.match(preview, /does not create a second payable/);
  const recorded = supplierInvoicePreview({
    status: "posted",
    procurementEntryId: "proc-1",
    journal: receipt,
    billCompanyId: "events",
    billSupplierOrganizationId: "supplier-1",
    billCurrency: "BHD",
    billTotal: toFils("25.000"),
    postedJournal: { sourceType: "procurement", number: "JNL-00009", reversed: false },
  });
  assert.match(recorded, /5600/);
  const billFirst = supplierInvoicePreview({
    status: "posted",
    procurementEntryId: "proc-1",
    journal: null,
    billCompanyId: "events",
    billSupplierOrganizationId: "supplier-1",
    billCurrency: "BHD",
    billTotal: toFils("25.000"),
    postedJournal: { sourceType: "supplier_bill", number: "JNL-00010", reversed: false },
  });
  assert.match(billFirst, /not posted again/);
});

test("procurement still posts when the linked bill is only a draft", () => {
  assert.equal(
    procurementPostDecision({ linkedBillState: "draft", linkedBillHasOpenJournal: false }).post,
    true,
  );
  assert.equal(
    procurementPostDecision({ linkedBillState: "none", linkedBillHasOpenJournal: false }).post,
    true,
  );
  assert.equal(
    procurementPostDecision({ linkedBillState: "reversed", linkedBillHasOpenJournal: false }).post,
    true,
  );
  const blocked = procurementPostDecision({
    linkedBillState: "posted",
    linkedBillHasOpenJournal: true,
    billNumber: "BILL-4",
  });
  assert.equal(blocked.post, false);
  if (!blocked.post) assert.match(blocked.message, /second journal was not posted/);
});

test("a linked cost posts once, and a second cost on the same operation is separate", () => {
  assert.equal(
    costRecognitionDecision({
      intent: "expense",
      linkedEntryId: "cost-1",
      openCostJournal: true,
      openExpenseJournal: false,
    }).post,
    false,
  );
  assert.equal(
    costRecognitionDecision({
      intent: "operation_cost",
      linkedEntryId: "cost-1",
      openCostJournal: false,
      openExpenseJournal: true,
    }).post,
    false,
  );
  assert.equal(
    costRecognitionDecision({
      intent: "expense",
      linkedEntryId: null,
      openCostJournal: true,
      openExpenseJournal: false,
    }).post,
    true,
  );
  assert.equal(
    costRecognitionDecision({
      intent: "expense",
      linkedEntryId: "cost-2",
      openCostJournal: false,
      openExpenseJournal: false,
    }).post,
    true,
  );
});

test("a repeated payment key returns the original only when the settlement is the same and still open", () => {
  const existing = {
    companyId: "events",
    direction: "payment",
    documentId: "bill-1",
    amount: toFils("20.000"),
    journalOpen: true,
  };
  assert.equal(
    paymentRetryDecision({
      existing,
      request: { companyId: "events", direction: "payment", documentId: "bill-1", amount: toFils("20.000") },
    }).action,
    "return-existing",
  );
  for (const request of [
    { companyId: "advertising", direction: "payment", documentId: "bill-1", amount: toFils("20.000") },
    { companyId: "events", direction: "receipt", documentId: "bill-1", amount: toFils("20.000") },
    { companyId: "events", direction: "payment", documentId: "bill-2", amount: toFils("20.000") },
    { companyId: "events", direction: "payment", documentId: "bill-1", amount: toFils("10.000") },
  ]) {
    assert.equal(paymentRetryDecision({ existing, request }).action, "refuse");
  }
  assert.equal(
    paymentRetryDecision({
      existing: { ...existing, journalOpen: false },
      request: { companyId: "events", direction: "payment", documentId: "bill-1", amount: toFils("20.000") },
    }).action,
    "refuse",
  );
  assert.equal(paymentRetryDecision({ existing: null, request: { companyId: "events", direction: "payment", documentId: "bill-1", amount: toFils("20.000") } }).action, "continue");
});

test("a repeated payment key returns the original, and a partial payment still posts", () => {
  assert.equal(
    settlementDecision({
      idempotencyKey: "key-1",
      existingPaymentForKey: true,
      keyBelongsToThisSettlement: true,
      outstanding: toFils("50.000"),
      amount: toFils("50.000"),
    }).action,
    "return-existing",
  );
  assert.equal(
    settlementDecision({
      idempotencyKey: "key-1",
      existingPaymentForKey: true,
      keyBelongsToThisSettlement: false,
      outstanding: toFils("50.000"),
      amount: toFils("10.000"),
    }).action,
    "refuse",
  );
  assert.equal(
    settlementDecision({
      idempotencyKey: "key-2",
      existingPaymentForKey: false,
      keyBelongsToThisSettlement: true,
      outstanding: toFils("50.000"),
      amount: toFils("20.000"),
    }).action,
    "post",
  );
  assert.equal(
    settlementDecision({
      idempotencyKey: null,
      existingPaymentForKey: false,
      keyBelongsToThisSettlement: true,
      outstanding: toFils("50.000"),
      amount: toFils("50.000"),
    }).action,
    "post",
  );
  const settled = settlementDecision({
    idempotencyKey: "key-3",
    existingPaymentForKey: false,
    keyBelongsToThisSettlement: true,
    outstanding: 0n,
    amount: toFils("1.000"),
  });
  assert.equal(settled.action, "refuse");
});

test("a bank movement linked to a settlement does not post, and an ordinary movement does", () => {
  assert.equal(bankMovementDecision({ settlementPaymentId: null }).post, true);
  assert.equal(bankMovementDecision({ settlementPaymentId: "" }).post, true);
  const blocked = bankMovementDecision({ settlementPaymentId: "pay-1" });
  assert.equal(blocked.post, false);
  if (!blocked.post) assert.match(blocked.message, /not posted/);
});

test("reversal leaves room for one new recognition, and payment links follow direction", () => {
  assert.equal(repostAfterReversal({ originalReversed: true, revisionIsNewSource: true }), true);
  assert.equal(repostAfterReversal({ originalReversed: false, revisionIsNewSource: true }), false);
  assert.equal(
    costRecognitionDecision({
      intent: "expense",
      linkedEntryId: "cost-1",
      openCostJournal: false,
      openExpenseJournal: false,
    }).post,
    true,
  );
  assert.equal(
    procurementPostDecision({ linkedBillState: "reversed", linkedBillHasOpenJournal: false }).post,
    true,
  );
  assert.equal(paymentViewHref("receipt", "pay-1"), "/accounting/receipts/pay-1");
  assert.equal(paymentViewHref("payment", "pay-1"), "/accounting/payouts/pay-1");
  assert.equal(filsToAmount(toFils("20.000")), "20.000");
});
