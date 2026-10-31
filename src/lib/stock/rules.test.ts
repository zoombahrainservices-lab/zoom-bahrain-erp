import assert from "node:assert/strict";
import test from "node:test";

import { filsToAmount, toFils } from "@/lib/accounting/money";

import { stockActorFromSession } from "./auth";
import { StockError } from "./errors";
import {
  STOCK_FINANCIAL_POSTING_ENABLED,
  LEDGER_POSTING_DISABLED,
  activeJournalDecision,
  assertJournalReversalAllowed,
  closedPeriodMessage,
  companyStockPosition,
  emptyOwnerBalance,
  journalDecision,
  lineIdempotencyKey,
  planLine,
  planReversal,
  proposeOpeningFromLegacy,
  reconcileStockToLedger,
  resolveOwnerId,
} from "./rules";

const fils = toFils;

test("financial posting stays off", () => {
  assert.equal(STOCK_FINANCIAL_POSTING_ENABLED, false);
});

test("warehouse staff can operate stock without accounting authority", () => {
  const employee = stockActorFromSession({
    userId: "employee-1",
    username: "warehouse",
    name: "Warehouse",
    role: "employee",
  });
  const admin = stockActorFromSession({
    userId: "admin-1",
    username: "admin",
    name: "Admin",
    role: "admin",
  });
  const client = stockActorFromSession({
    userId: "client-1",
    username: "client",
    name: "Client",
    role: "client",
  });
  assert.equal(employee.canOperate, true);
  assert.equal(employee.canPostFinancial, false);
  assert.equal(admin.canOperate, true);
  assert.equal(admin.canPostFinancial, true);
  assert.equal(client.canOperate, false);
  assert.equal(client.canPostFinancial, false);
});

test("the same SKU keeps company and customer owners apart", () => {
  assert.equal(resolveOwnerId("warehousing", "company", ""), "warehousing");
  assert.equal(resolveOwnerId("warehousing", "customer", "customer-1"), "customer-1");
  assert.throws(() => resolveOwnerId("warehousing", "customer", "warehousing"), StockError);
  assert.throws(() => resolveOwnerId("warehousing", "company", "customer-1"), StockError);
});

test("line idempotency keys allow many lines and reject a repeated submission key", () => {
  const first = lineIdempotencyKey("warehousing", "doc-1", "1");
  const second = lineIdempotencyKey("warehousing", "doc-1", "2");
  const retry = lineIdempotencyKey("warehousing", "doc-2", "9", "receipt-line-a");
  const sameRetry = lineIdempotencyKey("warehousing", "doc-3", "1", "receipt-line-a");
  assert.notEqual(first, second);
  assert.equal(retry, sameRetry);
});

test("company receipt, second receipt, and partial dispatch use moving average in fils", () => {
  let balance = emptyOwnerBalance();
  const first = planLine(balance, {
    ownership: "company",
    purpose: "receipt",
    quantity: fils("2.000"),
    unitCost: fils("1.500"),
  });
  balance = first.next;
  assert.equal(filsToAmount(balance.quantity), "2.000");
  assert.equal(filsToAmount(balance.average), "1.500");
  assert.equal(filsToAmount(balance.value), "3.000");

  const second = planLine(balance, {
    ownership: "company",
    purpose: "receipt",
    quantity: fils("1.000"),
    unitCost: fils("3.000"),
  });
  balance = second.next;
  assert.equal(filsToAmount(balance.quantity), "3.000");
  assert.equal(filsToAmount(balance.average), "2.000");
  assert.equal(filsToAmount(balance.value), "6.000");

  const partial = planLine(balance, {
    ownership: "company",
    purpose: "sale",
    quantity: fils("1.000"),
    unitCost: null,
  });
  assert.equal(filsToAmount(partial.movements[0].unitCost ?? 0n), "2.000");
  assert.equal(filsToAmount(partial.movements[0].valueImpact), "-2.000");
  assert.equal(filsToAmount(partial.next.quantity), "2.000");
  assert.equal(filsToAmount(partial.next.average), "2.000");
  assert.equal(filsToAmount(partial.next.value), "4.000");
  assert.throws(() => planLine(partial.next, {
    ownership: "company",
    purpose: "sale",
    quantity: fils("5.000"),
    unitCost: null,
  }), /Not enough valued stock/);
});

test("customer stock changes custody only", () => {
  const received = planLine(emptyOwnerBalance(), {
    ownership: "customer",
    purpose: "receipt",
    quantity: fils("4.000"),
    unitCost: fils("9.000"),
  });
  assert.equal(received.next.value, 0n);
  assert.equal(received.next.average, 0n);
  assert.equal(received.movements[0].valueImpact, 0n);
  const sent = planLine(received.next, {
    ownership: "customer",
    purpose: "sale",
    quantity: fils("1.000"),
    unitCost: null,
  });
  assert.equal(filsToAmount(sent.next.quantity), "3.000");
  assert.equal(sent.next.value, 0n);
});

test("a transfer keeps the owner quantity and value", () => {
  const received = planLine(emptyOwnerBalance(), {
    ownership: "company",
    purpose: "receipt",
    quantity: fils("5.000"),
    unitCost: fils("2.000"),
  });
  const moved = planLine(received.next, {
    ownership: "company",
    purpose: "transfer",
    quantity: fils("2.000"),
    unitCost: fils("8.000"),
  });
  assert.equal(moved.next.quantity, received.next.quantity);
  assert.equal(moved.next.value, received.next.value);
  assert.equal(moved.next.average, received.next.average);
  assert.equal(moved.movements.length, 2);
  assert.equal(moved.movements[0].valueImpact, 0n);
  assert.equal(moved.movements[1].valueImpact, 0n);
});

test("a missing cost stays pending and out of the average", () => {
  const pending = planLine(emptyOwnerBalance(), {
    ownership: "company",
    purpose: "receipt",
    quantity: fils("2.000"),
    unitCost: null,
  });
  assert.equal(pending.movements[0].valuation, "pending");
  assert.equal(filsToAmount(pending.next.pending), "2.000");
  assert.equal(pending.next.quantity, 0n);
  assert.equal(pending.next.value, 0n);
  const valued = planLine(pending.next, {
    ownership: "company",
    purpose: "receipt",
    quantity: fils("1.000"),
    unitCost: fils("4.000"),
  });
  assert.equal(filsToAmount(valued.next.quantity), "1.000");
  assert.equal(filsToAmount(valued.next.average), "4.000");
  assert.equal(filsToAmount(valued.next.pending), "2.000");
  assert.equal(valued.next.value, fils("4.000"));
});

test("receipt and dispatch reversals restore the stored cost", () => {
  const received = planLine(emptyOwnerBalance(), {
    ownership: "company",
    purpose: "receipt",
    quantity: fils("2.000"),
    unitCost: fils("1.500"),
  });
  const issued = planLine(received.next, {
    ownership: "company",
    purpose: "consumption",
    quantity: fils("1.000"),
    unitCost: null,
  });
  const restored = planReversal(issued.next, {
    ownership: "company",
    ownerEffect: "quantity_out",
    quantity: fils("1.000"),
    valueImpact: issued.movements[0].valueImpact,
  });
  assert.equal(filsToAmount(restored.quantity), "2.000");
  assert.equal(filsToAmount(restored.value), "3.000");
  assert.equal(filsToAmount(restored.average), "1.500");
  const cleared = planReversal(restored, {
    ownership: "company",
    ownerEffect: "quantity_in",
    quantity: fils("2.000"),
    valueImpact: received.movements[0].valueImpact,
  });
  assert.equal(cleared.quantity, 0n);
  assert.equal(cleared.value, 0n);
});

test("an adjustment changes quantity through the same average rules", () => {
  const up = planLine(emptyOwnerBalance(), {
    ownership: "company",
    purpose: "adjustment_in",
    quantity: fils("2.000"),
    unitCost: fils("1.000"),
  });
  const down = planLine(up.next, {
    ownership: "company",
    purpose: "adjustment_out",
    quantity: fils("0.500"),
    unitCost: null,
  });
  assert.equal(filsToAmount(down.next.quantity), "1.500");
  assert.equal(filsToAmount(down.next.average), "1.000");
  assert.equal(filsToAmount(down.next.value), "1.500");
});

test("journals stay unposted and customer, pending, transfer, and billed receipts never hit payables", () => {
  const receipt = activeJournalDecision({
    ownership: "company",
    purpose: "receipt",
    valuation: "valued",
    valueImpact: fils("3.000"),
    linkedProcurementOrBill: false,
  });
  assert.equal(receipt.posts, false);
  assert.equal(receipt.debitCode, "1200");
  assert.equal(receipt.creditCode, "2000");
  assert.equal(receipt.reason, LEDGER_POSTING_DISABLED);

  const billed = journalDecision({
    ownership: "company",
    purpose: "receipt",
    valuation: "valued",
    valueImpact: fils("3.000"),
    linkedProcurementOrBill: true,
    financialPostingEnabled: true,
  });
  assert.equal(billed.posts, false);
  assert.match(billed.reason, /another payable/);

  const customer = activeJournalDecision({
    ownership: "customer",
    purpose: "receipt",
    valuation: "not_applicable",
    valueImpact: 0n,
    linkedProcurementOrBill: false,
  });
  assert.equal(customer.posts, false);
  assert.equal(customer.debitCode, null);

  const pending = activeJournalDecision({
    ownership: "company",
    purpose: "receipt",
    valuation: "pending",
    valueImpact: 0n,
    linkedProcurementOrBill: false,
  });
  assert.equal(pending.posts, false);

  const transfer = activeJournalDecision({
    ownership: "company",
    purpose: "transfer",
    valuation: "not_applicable",
    valueImpact: 0n,
    linkedProcurementOrBill: false,
  });
  assert.equal(transfer.posts, false);

  const sale = activeJournalDecision({
    ownership: "company",
    purpose: "sale",
    valuation: "valued",
    valueImpact: fils("-2.000"),
    linkedProcurementOrBill: false,
  });
  assert.equal(sale.posts, false);
  assert.equal(sale.debitCode, "5610");
  assert.equal(sale.creditCode, "1200");
});

test("a linked journal cannot be reversed while ledger posting is disabled", () => {
  assert.equal(assertJournalReversalAllowed({
    journalId: null,
    financialPostingEnabled: false,
    canPostFinancial: false,
  }), "no_journal");
  assert.throws(() => assertJournalReversalAllowed({
    journalId: "journal-1",
    financialPostingEnabled: false,
    canPostFinancial: true,
  }), /financial reversal stays disabled/);
});

test("a closed period blocks the date and an open period does not", () => {
  const periods = [{ startsOn: "2026-01-01", endsOn: "2026-12-31", status: "closed" }];
  assert.match(closedPeriodMessage(periods, "2026-05-01") ?? "", /closed/);
  assert.equal(closedPeriodMessage([{ ...periods[0], status: "open" }], "2026-05-01"), null);
});

test("pending quantity is excluded from company inventory value and ledger reconciliation", () => {
  const position = companyStockPosition([
    { ownership: "company", quantity: fils("2.000"), pending: fils("5.000"), value: fils("8.000") },
    { ownership: "customer", quantity: fils("9.000"), pending: 0n, value: fils("40.000") },
  ]);
  assert.equal(filsToAmount(position.quantity), "2.000");
  assert.equal(filsToAmount(position.pending), "5.000");
  assert.equal(filsToAmount(position.value), "8.000");
  assert.equal(position.includesPendingInValue, false);
  const gap = reconcileStockToLedger(position.value, fils("3.000"));
  assert.equal(gap.status, "difference");
  assert.equal(filsToAmount(gap.difference), "5.000");
  assert.equal(reconcileStockToLedger(fils("3.000"), fils("3.000")).status, "matched");
});

test("opening proposals use the legacy balance and ignore legacy movement sums", () => {
  const proposal = proposeOpeningFromLegacy({
    legacyItemId: "item-1",
    companyId: "warehousing",
    sku: "SKU-1",
    ownership: "company",
    ownerId: "warehousing",
    warehouseId: "wh",
    locationId: "loc",
    quantity: "2.000",
    averageCost: "1.500",
    cutoverDate: "2026-10-29",
    legacyMoveQuantities: ["9.000", "4.000"],
  });
  assert.equal(proposal.status, "proposed");
  assert.equal(proposal.ignoredLegacyMoves, true);
  assert.equal(filsToAmount(proposal.quantity), "2.000");
  assert.equal(filsToAmount(proposal.averageCost), "1.500");
  assert.equal(proposal.legacyMoveCount, 2);
});
