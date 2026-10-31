import assert from "node:assert/strict";
import test from "node:test";

import {
  accountVisibleForCompany,
  bankAccountHref,
  bankKindLabel,
  bankMovementLabel,
} from "./bank-labels";

test("a selected account from another company is not kept on screen", () => {
  assert.equal(accountVisibleForCompany("zoom", "solutions", ["zoom", "solutions"]), "other-company");
  assert.equal(accountVisibleForCompany("zoom", "all", ["zoom", "solutions"]), "visible");
  assert.equal(accountVisibleForCompany("zoom", "zoom", ["zoom"]), "visible");
  assert.equal(accountVisibleForCompany("hidden", "all", ["zoom"]), "inaccessible");
});

test("movement labels use the posted source, and bank movements use the line kind", () => {
  assert.equal(bankMovementLabel("bank_movement", "withdrawal"), "Withdrawal");
  assert.equal(bankMovementLabel("bank_movement", "charge"), "Bank charge");
  assert.equal(bankMovementLabel("receipt", ""), "Receipt");
  assert.equal(bankMovementLabel("bank_transfer", "From cash"), "Transfer");
});

test("cash and bank kinds stay distinct, and selection keeps the filter query", () => {
  assert.equal(bankKindLabel("cash"), "Cash");
  assert.equal(bankKindLabel("bank"), "Bank");
  assert.equal(bankAccountHref("acct-1", "company=zoom&from=2026-01-01&to=2026-10-31"), "/accounting/banking/acct-1?company=zoom&from=2026-01-01&to=2026-10-31");
  assert.equal(bankAccountHref(null, "from=2026-01-01&to=2026-10-31"), "/accounting/banking?from=2026-01-01&to=2026-10-31");
});
