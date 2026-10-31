import assert from "node:assert/strict";
import test from "node:test";

import { defaultChart } from "./chart";
import {
  assertBalanced,
  filsToAmount,
  lineSide,
  splitInclusiveVat,
  toFils,
} from "./money";
import { buildBalanceSheet, profitAndLoss, trialBalanceSide } from "./statements";

test("BHD amounts keep three decimal places", () => {
  assert.equal(toFils("10"), 10000n);
  assert.equal(toFils("10.2"), 10200n);
  assert.equal(toFils("1.2346"), 1235n);
  assert.equal(filsToAmount(1235n), "1.235");
  assert.equal(filsToAmount(-500n), "-0.500");
});

test("posted journals must balance", () => {
  assert.throws(
    () => assertBalanced([lineSide("10.000", "0"), lineSide("0", "9.000")]),
    /out of balance/,
  );
  assert.doesNotThrow(() =>
    assertBalanced([lineSide("10.500", "0"), lineSide("0", "10.500")]),
  );
});

test("a line cannot carry both a debit and a credit", () => {
  assert.throws(() => lineSide("1.000", "1.000"), /both/);
});

test("inclusive Bahrain VAT splits 110 into 100 and 10", () => {
  const split = splitInclusiveVat(toFils("110.000"), "10.000");
  assert.equal(filsToAmount(split.net), "100.000");
  assert.equal(filsToAmount(split.vat), "10.000");
});

test("exempt VAT does not invent tax", () => {
  const split = splitInclusiveVat(toFils("110.000"), "0");
  assert.equal(split.vat, 0n);
  assert.equal(split.net, toFils("110.000"));
});

test("trial balance debit and credit columns match", () => {
  const left = trialBalanceSide(1500n, 0n);
  const right = trialBalanceSide(0n, 1500n);
  assert.equal(left.debit + right.debit, left.credit + right.credit);
});

test("balance sheet includes unclosed earnings", () => {
  const statement = buildBalanceSheet([
    { accountType: "asset", debit: 110000n, credit: 0n },
    { accountType: "income", debit: 0n, credit: 100000n },
    { accountType: "liability", debit: 0n, credit: 10000n },
  ]);
  assert.equal(statement.balanced, true);
  assert.equal(statement.earnings, 100000n);
});

test("profit is income minus expenses", () => {
  const result = profitAndLoss([
    { accountType: "income", debit: 0n, credit: 5000n },
    { accountType: "expense", debit: 2000n, credit: 0n },
  ]);
  assert.equal(result.profit, 3000n);
});

test("default chart codes are unique and cover the control accounts", () => {
  const codes = defaultChart.map((account) => account.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of ["1000", "1010", "1100", "1150", "2000", "2100", "4000", "5900"]) {
    assert.ok(codes.includes(code));
  }
});
