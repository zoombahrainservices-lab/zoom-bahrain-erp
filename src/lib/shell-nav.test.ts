import assert from "node:assert/strict";
import test from "node:test";

import {
  collectShellItems,
  isShellItemCurrent,
  visibleFinancialModules,
  visibleZoomItems,
} from "./shell-nav";

const items = collectShellItems({ admin: true });

function current(pathname: string, id: string) {
  const item = items.find((entry) => entry.id === id);
  assert.ok(item, id);
  return isShellItemCurrent(pathname, item, items);
}

test("home, guide, and now are separate pages in that order", () => {
  assert.deepEqual(
    items.slice(0, 3).map((item) => [item.id, item.href]),
    [
      ["home", "/dashboard"],
      ["guide", "/guide"],
      ["now", "/now"],
    ],
  );
  assert.equal(items.filter((item) => item.id === "now").length, 1);
  assert.equal(visibleZoomItems({ admin: true }).some((item) => item.id === "now"), false);
  assert.equal(current("/guide", "guide"), true);
  assert.equal(current("/guide", "home"), false);
  assert.equal(current("/now", "now"), true);
  assert.equal(current("/dashboard", "guide"), false);
});

test("home and the books overview stay on an exact match", () => {
  assert.equal(current("/dashboard", "home"), true);
  assert.equal(current("/dashboard/extra", "home"), false);
  assert.equal(current("/accounting", "books-overview"), true);
  assert.equal(current("/accounting/sales", "books-overview"), false);
  assert.equal(current("/accounting/reports/profit-and-loss", "books-overview"), false);
});

test("detail pages highlight the list they belong to", () => {
  assert.equal(current("/accounting/payments/pay-1", "payments-receipts"), true);
  assert.equal(current("/accounting/banking/bank-1", "bank-accounts"), true);
  assert.equal(current("/accounting/journals/new", "journals"), true);
  assert.equal(current("/accounting/journals/jr-1", "journals"), true);
  assert.equal(current("/accounting/ledgers/contact/c-1", "ledgers"), true);
  assert.equal(current("/accounting/ledgers/org-1", "ledgers"), true);
  assert.equal(current("/accounting/purchases/bills/bill-1", "bills-expenses"), true);
  assert.equal(current("/accounting/reports/profit-and-loss", "financial-reports"), true);
  assert.equal(current("/operations/op-1/documents/entry-1", "operations"), true);
  assert.equal(current("/organizations/new", "organizations"), true);
  assert.equal(current("/services/svc-1", "services"), true);
  assert.equal(current("/divisions/zoom", "companies"), true);
});

test("a more specific destination wins over a shorter prefix", () => {
  assert.equal(current("/accounting/reports/cash-flow", "financial-reports"), true);
  assert.equal(current("/accounting/reports/cash-flow", "analytics"), false);
  assert.equal(current("/accounting/desk", "operation-money"), true);
  assert.equal(current("/accounting/desk", "books-overview"), false);
});

test("sale and purchase follow the party-first billing steps", () => {
  const modules = visibleFinancialModules({ admin: true });
  const sale = modules.find((module) => module.id === "sale");
  const purchase = modules.find((module) => module.id === "purchase");
  assert.deepEqual(
    sale?.items.map((item) => item.id),
    [
      "sale-invoice",
      "payment-in",
      "sale-order",
      "quotation",
      "delivery",
      "sale-return",
      "enquiries",
      "proposals",
    ],
  );
  assert.equal(sale?.items.find((item) => item.id === "quotation")?.href, "/quotation");
  assert.equal(sale?.items.find((item) => item.id === "sale-invoice")?.href, "/accounting/sales");
  assert.equal(sale?.items.some((item) => item.href === "/invoice"), false);
  assert.equal(sale?.items.find((item) => item.id === "sale-invoice")?.createHref, "/accounting/start/sale-invoice");
  assert.deepEqual(
    purchase?.items.map((item) => item.id),
    ["bills-expenses", "payment-out", "purchase-order", "purchase-return", "expense", "procurement"],
  );
  assert.equal(current("/accounting/transactions/sale-order/op/entry", "sale-order"), true);
  assert.equal(current("/accounting/transactions/sale-order/op/entry", "sale-return"), false);
  assert.equal(current("/accounting/receipts", "payment-in"), true);
  assert.equal(current("/accounting/payments/pay-1", "payment-in"), false);
  assert.equal(current("/accounting/expenses", "expense"), true);
  assert.equal(current("/accounting/purchases/bills/bill-1", "expense"), false);
});

test("staff without user admin do not see the users item or admin create controls", () => {
  const staff = collectShellItems({ admin: false });
  assert.equal(staff.some((item) => item.id === "users"), false);
  const organizations = visibleFinancialModules({ admin: false })
    .flatMap((module) => module.items)
    .find((item) => item.id === "organizations");
  assert.equal(organizations?.createHref, undefined);
  const hrefs = staff.map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(
    visibleFinancialModules({ admin: false }).some((module) => module.id === "utilities"),
    true,
  );
});
