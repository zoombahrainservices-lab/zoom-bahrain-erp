import assert from "node:assert/strict";
import test from "node:test";

import {
  ageBucket,
  classifyCashOffset,
  convertToBhd,
  maskAccount,
  parseStatementCsv,
  priceBillLine,
  statementFingerprint,
  sumPriced,
  vatDueDate,
  vatOnNet,
} from "./documents";
import { filsToAmount, toFils } from "./money";

const standard = { id: "std", rate: "10.000", treatment: "standard" as const };

test("supplier bill VAT is added to the exclusive price", () => {
  const line = priceBillLine({
    description: "Rent",
    quantity: "2.000",
    unitAmount: "50.000",
    discount: "10.000",
    expenseAccountId: "rent",
    vat: standard,
  });
  assert.equal(filsToAmount(line.net), "90.000");
  assert.equal(filsToAmount(line.vat), "9.000");
  assert.equal(filsToAmount(line.supplierTotal), "99.000");
});

test("non-recoverable VAT stays in the expense and is still owed to the supplier", () => {
  const line = priceBillLine({
    description: "Entertainment",
    quantity: "1.000",
    unitAmount: "100.000",
    discount: "0",
    expenseAccountId: "other",
    vat: { id: "nr", rate: "10.000", treatment: "non_recoverable" },
  });
  assert.equal(line.recoverableVat, 0n);
  assert.equal(filsToAmount(line.nonRecoverableVat), "10.000");
  assert.equal(filsToAmount(line.supplierTotal), "110.000");
});

test("reverse charge does not increase the supplier total", () => {
  const line = priceBillLine({
    description: "Imported service",
    quantity: "1.000",
    unitAmount: "100.000",
    discount: "0",
    expenseAccountId: "other",
    vat: { id: "rc", rate: "10.000", treatment: "reverse_charge" },
  });
  assert.equal(filsToAmount(line.supplierTotal), "100.000");
  assert.equal(filsToAmount(line.outputVat), "10.000");
  assert.equal(filsToAmount(line.recoverableVat), "10.000");
});

test("a discount cannot exceed the line", () => {
  assert.throws(
    () =>
      priceBillLine({
        description: "Too much",
        quantity: "1",
        unitAmount: "5.000",
        discount: "6.000",
        expenseAccountId: "other",
        vat: null,
      }),
    /Discount/,
  );
});

test("foreign amounts convert with an explicit rate", () => {
  assert.equal(filsToAmount(convertToBhd(toFils("10.000"), "0.376")), "3.760");
});

test("aging buckets use the due date", () => {
  assert.equal(ageBucket("2026-03-31", "2026-03-31"), "Current");
  assert.equal(ageBucket("2026-04-15", "2026-03-31"), "1–30");
  assert.equal(ageBucket("2026-07-15", "2026-03-31"), "Over 90");
});

test("cash lines are classified from the other account", () => {
  assert.equal(classifyCashOffset("expense", "rent"), "operating");
  assert.equal(classifyCashOffset("asset", "bank"), "transfer");
  assert.equal(classifyCashOffset("asset", "fixed_asset"), "investing");
  assert.equal(classifyCashOffset("liability", "loan"), "financing");
});

test("the same statement line has one fingerprint", () => {
  const first = statementFingerprint({
    date: "2026-01-02",
    amount: "1.500",
    reference: "ABC",
    description: "Fee",
  });
  const second = statementFingerprint({
    date: "2026-01-02",
    amount: "1.5",
    reference: "abc",
    description: " fee ",
  });
  assert.equal(first, second);
});

test("statement CSV accepts debit and credit columns", () => {
  const lines = parseStatementCsv("date,description,debit,credit\n2026-01-02,Fee,1.500,0\n");
  assert.equal(lines[0]?.amount, "1.500");
});

test("VAT due date is the last day of the following month", () => {
  assert.equal(vatDueDate("2026-03-31"), "2026-04-30");
  assert.equal(vatDueDate("2026-12-31"), "2027-01-31");
});

test("exclusive VAT rounds half up on the fils", () => {
  assert.equal(filsToAmount(vatOnNet(toFils("10.004"), "10")), "1.000");
});

test("account numbers show only the last four characters", () => {
  assert.equal(maskAccount("BH12ZOOM00001234"), "•••• 1234");
});

test("priced lines add up", () => {
  const line = priceBillLine({
    description: "Paper",
    quantity: "1",
    unitAmount: "3.000",
    discount: "0",
    expenseAccountId: "supplies",
    vat: standard,
  });
  const total = sumPriced([line, line]);
  assert.equal(filsToAmount(total.supplierTotal), "6.600");
});
