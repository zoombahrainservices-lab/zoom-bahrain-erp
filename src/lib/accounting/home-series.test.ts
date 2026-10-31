import assert from "node:assert/strict";
import test from "node:test";

import { addHomeAmount, blankHomeMonths, monthsBetween } from "./home-series";

test("months cover the selected period and keep the latest months when the range is long", () => {
  assert.deepEqual(monthsBetween("2026-01-15", "2026-03-02").months, [
    "2026-01",
    "2026-02",
    "2026-03",
  ]);
  const long = monthsBetween("2020-01-01", "2026-06-30", 36);
  assert.equal(long.truncated, true);
  assert.equal(long.months.length, 36);
  assert.equal(long.months[0], "2023-07");
  assert.equal(long.months.at(-1), "2026-06");
});

test("home months ignore missing conversions and months outside the chart", () => {
  const months = blankHomeMonths(["2026-01", "2026-02"]);
  addHomeAmount(months, "2026-01", "sales", 1500n);
  addHomeAmount(months, "2026-01", "moneyIn", null);
  addHomeAmount(months, "2019-01", "purchases", 9000n);
  assert.equal(months[0]?.sales, 1500n);
  assert.equal(months[0]?.moneyIn, 0n);
  assert.equal(months[1]?.purchases, 0n);
});
