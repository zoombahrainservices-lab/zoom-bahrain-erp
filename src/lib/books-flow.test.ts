import assert from "node:assert/strict";
import test from "node:test";

import { bookKinds, getBookKind, isBookSlipType } from "./books-flow";
import { isCommercialDocumentType } from "./operation-documents";

test("sale invoices and quotations stay on the current documents", () => {
  const invoice = getBookKind("sale-invoice");
  const quotation = getBookKind("quotation");
  assert.equal(invoice?.opens, "document");
  assert.equal(invoice?.entryType, "invoice");
  assert.equal(invoice?.href, "/accounting/sales");
  assert.equal(quotation?.opens, "document");
  assert.equal(quotation?.entryType, "quotation");
  assert.equal(quotation?.href, "/quotation");
  assert.equal(isCommercialDocumentType("invoice"), true);
  assert.equal(isCommercialDocumentType("quotation"), true);
});

test("orders, delivery notes, and returns are slips beside those documents", () => {
  for (const id of ["sale-order", "delivery", "sale-return", "purchase-order", "purchase-return"]) {
    const kind = getBookKind(id);
    assert.equal(kind?.opens, "slip");
    assert.equal(isBookSlipType(kind?.entryType ?? ""), true);
    assert.equal(isCommercialDocumentType(kind?.entryType ?? ""), false);
  }
  const order = getBookKind("sale-order");
  assert.deepEqual(order?.convertTo, ["quotation", "sale-invoice"]);
});

test("payment in, payment out, bills, and expenses open their own forms", () => {
  assert.equal(getBookKind("payment-in")?.href, "/accounting/receipts");
  assert.equal(getBookKind("payment-out")?.href, "/accounting/payouts");
  assert.equal(getBookKind("purchase-bill")?.href, "/accounting/purchases");
  assert.equal(getBookKind("expense")?.href, "/accounting/expenses");
  assert.equal(bookKinds.filter((kind) => kind.menu === "sale").length, 6);
  assert.equal(bookKinds.filter((kind) => kind.menu === "purchase").length, 6);
});
