import assert from "node:assert/strict";
import test from "node:test";

import { emptyOwnerBalance } from "./rules";
import { legacyDirectStockEditsEnabled } from "./legacy";
import { compareLegacyAndSubledger } from "./display";
import { applyOperationalLine } from "./operational-rules";

test("a valued company receipt stays blocked while ledger posting is disabled", () => {
  assert.throws(() => applyOperationalLine({
    ownership: "company",
    purpose: "receipt",
    quantity: "2.000",
    unitCost: "1.500",
    balance: emptyOwnerBalance(),
    linkedProcurementOrBill: false,
    confirmZeroCost: false,
    canPostFinancial: false,
  }), /Inventory ledger posting is disabled/);
});

test("a blank cost is pending valuation and is not treated as zero", () => {
  const next = applyOperationalLine({
    ownership: "company",
    purpose: "receipt",
    quantity: "2.000",
    unitCost: null,
    balance: emptyOwnerBalance(),
    linkedProcurementOrBill: false,
    confirmZeroCost: false,
    canPostFinancial: false,
  });
  assert.equal(next.quantity, 0n);
  assert.equal(next.pending, 2000n);
  assert.equal(next.value, 0n);
});

test("zero cost needs an explicit confirmation and accounting authority", () => {
  assert.throws(() => applyOperationalLine({
    ownership: "company",
    purpose: "receipt",
    quantity: "1.000",
    unitCost: "0.000",
    balance: emptyOwnerBalance(),
    linkedProcurementOrBill: false,
    confirmZeroCost: false,
    canPostFinancial: true,
  }), /zero unit cost/);
  assert.throws(() => applyOperationalLine({
    ownership: "company",
    purpose: "receipt",
    quantity: "1.000",
    unitCost: "0",
    balance: emptyOwnerBalance(),
    linkedProcurementOrBill: false,
    confirmZeroCost: true,
    canPostFinancial: false,
  }), /zero unit cost/);
  const confirmed = applyOperationalLine({
    ownership: "company",
    purpose: "receipt",
    quantity: "1.000",
    unitCost: "0.000",
    balance: emptyOwnerBalance(),
    linkedProcurementOrBill: false,
    confirmZeroCost: true,
    canPostFinancial: true,
  });
  assert.equal(confirmed.quantity, 1000n);
  assert.equal(confirmed.value, 0n);
});

test("a company dispatch with stock still waits for the ledger", () => {
  assert.throws(() => applyOperationalLine({
    ownership: "company",
    purpose: "sale",
    quantity: "1.000",
    unitCost: null,
    balance: { quantity: 2000n, pending: 0n, average: 1500n, value: 3000n, allowNegative: false },
    linkedProcurementOrBill: false,
    confirmZeroCost: false,
    canPostFinancial: true,
  }), /Inventory ledger posting is disabled/);
});

test("customer custody and transfers do not require an inventory journal", () => {
  const received = applyOperationalLine({
    ownership: "customer",
    purpose: "receipt",
    quantity: "4.000",
    unitCost: "9.000",
    balance: emptyOwnerBalance(),
    linkedProcurementOrBill: false,
    confirmZeroCost: false,
    canPostFinancial: false,
  });
  assert.equal(received.value, 0n);
  assert.equal(received.quantity, 4000n);
  const moved = applyOperationalLine({
    ownership: "customer",
    purpose: "transfer",
    quantity: "1.000",
    unitCost: null,
    balance: received,
    linkedProcurementOrBill: false,
    confirmZeroCost: false,
    canPostFinancial: false,
  });
  assert.equal(moved.quantity, received.quantity);
  assert.equal(moved.value, 0n);
});

test("a procurement-linked company receipt is not capitalized", () => {
  assert.throws(() => applyOperationalLine({
    ownership: "company",
    purpose: "receipt",
    quantity: "1.000",
    unitCost: "2.000",
    balance: emptyOwnerBalance(),
    linkedProcurementOrBill: true,
    confirmZeroCost: false,
    canPostFinancial: true,
  }), /procurement or a supplier bill/);
});

test("legacy and subledger quantities are reported separately", () => {
  const compared = compareLegacyAndSubledger({
    legacyQuantity: "8.000",
    legacyAverage: "1.500",
    subledgerQuantity: "0.000",
    subledgerValue: "0.000",
  });
  assert.equal(compared.status, "Not migrated");
  assert.equal(compared.combined, false);
  assert.equal(compared.legacyQuantity, "8.000");
  assert.equal(compared.subledgerQuantity, "0.000");
  assert.notEqual(compared.legacyValue, compared.subledgerValue);
});

test("the legacy stock flag cannot reopen a second quantity write path", () => {
  const previous = process.env.LEGACY_DIRECT_STOCK_EDITS;
  delete process.env.LEGACY_DIRECT_STOCK_EDITS;
  assert.equal(legacyDirectStockEditsEnabled(), false);
  process.env.LEGACY_DIRECT_STOCK_EDITS = "on";
  assert.equal(legacyDirectStockEditsEnabled(), false);
  if (previous === undefined) delete process.env.LEGACY_DIRECT_STOCK_EDITS;
  else process.env.LEGACY_DIRECT_STOCK_EDITS = previous;
});

