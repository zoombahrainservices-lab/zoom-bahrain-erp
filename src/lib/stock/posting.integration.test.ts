import assert from "node:assert/strict";
import test from "node:test";
import { and, eq, sql } from "drizzle-orm";

import { closeDatabase, db } from "@/db";
import {
  accountingLocations,
  accountingPeriods,
  accountingWarehouses,
  stockDocumentLines,
  stockDocuments,
  stockMovements,
  stockOpeningProposals,
  stockOwnerBalances,
  stockLocationBalances,
} from "@/db/schema";

import type { StockActor } from "./auth";
import { StockError } from "./errors";
import {
  approveStockDocument,
  createStockDraft,
  postOpeningBalance,
  postStockDocument,
  recordOpeningProposal,
  reverseStockDocument,
  setNegativeStockPolicy,
  updateStockDraft,
  type StockTx,
} from "./posting";

class Rollback extends Error {}

const companyId = "stock-phase1-test";
const customerId = "stock-phase1-customer";
let userId = "";

test.before(async () => {
  const user = await db.query.users.findFirst();
  userId = user?.id ?? "";
});

test.after(async () => {
  await closeDatabase();
});

function actor(financial = false): StockActor {
  return { userId, canOperate: true, canPostFinancial: financial };
}

async function rolled(work: (tx: StockTx) => Promise<void>) {
  if (!userId) throw new Error("No user is available for the stock integration test.");
  try {
    await db.transaction(async (tx) => {
      await work(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (error instanceof Rollback) return;
    throw error;
  }
}

async function legacySnapshot(tx: StockTx) {
  const items = await tx.execute(sql`SELECT count(*)::text AS n, coalesce(sum(quantity), 0)::text AS qty, coalesce(sum(average_cost), 0)::text AS cost FROM accounting_items`);
  const moves = await tx.execute(sql`SELECT count(*)::text AS n FROM accounting_stock_moves`);
  const journals = await tx.execute(sql`SELECT count(*)::text AS n FROM accounting_journals`);
  return { items: first(items), moves: first(moves), journals: first(journals) };
}

function first(rows: unknown) {
  const list = Array.isArray(rows)
    ? rows
    : rows && typeof rows === "object" && "rows" in rows
      ? (rows as { rows: unknown[] }).rows
      : [];
  return list[0] as { n: string; qty?: string; cost?: string };
}

async function places(tx: StockTx) {
  const warehouseId = crypto.randomUUID();
  const main = crypto.randomUUID();
  const other = crypto.randomUUID();
  const secondWarehouse = crypto.randomUUID();
  const secondLocation = crypto.randomUUID();
  await tx.insert(accountingWarehouses).values([
    { id: warehouseId, companyId, name: "Phase 1 main" },
    { id: secondWarehouse, companyId, name: "Phase 1 other" },
  ]);
  await tx.insert(accountingLocations).values([
    { id: main, warehouseId, name: "Main" },
    { id: other, warehouseId, name: "Bulk" },
    { id: secondLocation, warehouseId: secondWarehouse, name: "Remote" },
  ]);
  return { warehouseId, main, other, secondWarehouse, secondLocation };
}

async function postDocument(tx: StockTx, input: {
  kind: "receipt" | "dispatch" | "transfer" | "return" | "adjustment";
  purpose: "receipt" | "sale" | "consumption" | "supplier_return" | "write_off" | "other" | "transfer" | "customer_return" | "adjustment_in" | "adjustment_out";
  ownership: "company" | "customer";
  ownerId?: string;
  warehouseId: string;
  locationId: string;
  toWarehouseId?: string;
  toLocationId?: string;
  movedOn?: string;
  procurementEntryId?: string;
  lines: Array<{ lineKey: string; sku: string; quantity: string; unitCost?: string | null; idempotencyKey?: string }>;
  financial?: boolean;
}) {
  const draft = await createStockDraft(tx, {
    companyId,
    kind: input.kind,
    purpose: input.purpose,
    ownership: input.ownership,
    ownerId: input.ownerId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
    toWarehouseId: input.toWarehouseId,
    toLocationId: input.toLocationId,
    movedOn: input.movedOn ?? "2026-10-29",
    procurementEntryId: input.procurementEntryId,
    lines: input.lines,
    actor: actor(input.financial),
  });
  await approveStockDocument(tx, draft.id, actor(input.financial));
  const posted = await postStockDocument(tx, draft.id, actor(input.financial));
  return { ...posted, created: draft.created };
}

test("company receipts, partial dispatch, reversal, pending valuation, and adjustments post once", async () => {
  await rolled(async (tx) => {
    const before = await legacySnapshot(tx);
    const site = await places(tx);
    const draft = await createStockDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      movedOn: "2026-10-29",
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "2.000", unitCost: "1.500" }],
      actor: actor(false),
    });
    const balanceAfterDraft = await tx.query.stockOwnerBalances.findFirst({
      where: eq(stockOwnerBalances.companyId, companyId),
    });
    assert.equal(balanceAfterDraft, undefined);
    await approveStockDocument(tx, draft.id, actor(false));
    const stillDraftBalance = await tx.query.stockOwnerBalances.findFirst({
      where: eq(stockOwnerBalances.companyId, companyId),
    });
    assert.equal(stillDraftBalance, undefined);

    await postStockDocument(tx, draft.id, actor(false));
    await postDocument(tx, {
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "1.000", unitCost: "3.000" }],
    });
    let owner = await ownerBalance(tx, "BOLT", "company", companyId);
    assert.equal(owner?.quantity, "3.000");
    assert.equal(owner?.averageCost, "2.000");
    assert.equal(owner?.inventoryValue, "6.000");

    const sold = await postDocument(tx, {
      kind: "dispatch",
      purpose: "sale",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "1.000" }],
    });
    const saleMove = await tx.query.stockMovements.findFirst({ where: eq(stockMovements.id, sold.movementIds[0]) });
    assert.equal(saleMove?.journalId, null);
    assert.equal(saleMove?.unitCost, "2.000");
    assert.equal(saleMove?.journalDebitCode, "5610");
    assert.equal(saleMove?.journalCreditCode, "1200");
    owner = await ownerBalance(tx, "BOLT", "company", companyId);
    assert.equal(owner?.quantity, "2.000");
    assert.equal(owner?.inventoryValue, "4.000");

    await assert.rejects(() => postDocument(tx, {
      kind: "dispatch",
      purpose: "consumption",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "9.000" }],
    }), /Not enough valued stock/);

    await reverseStockDocument(tx, sold.id, actor(false), "2026-10-29");
    owner = await ownerBalance(tx, "BOLT", "company", companyId);
    assert.equal(owner?.quantity, "3.000");
    assert.equal(owner?.inventoryValue, "6.000");

    await reverseStockDocument(tx, draft.id, actor(false), "2026-10-29");
    owner = await ownerBalance(tx, "BOLT", "company", companyId);
    assert.equal(owner?.quantity, "1.000");
    assert.equal(owner?.averageCost, "3.000");
    assert.equal(owner?.inventoryValue, "3.000");

    await postDocument(tx, {
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "4.000", unitCost: null }],
    });
    owner = await ownerBalance(tx, "BOLT", "company", companyId);
    assert.equal(owner?.quantity, "1.000");
    assert.equal(owner?.pendingQuantity, "4.000");
    assert.equal(owner?.inventoryValue, "3.000");

    await postDocument(tx, {
      kind: "adjustment",
      purpose: "adjustment_out",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "1.000" }],
    });
    owner = await ownerBalance(tx, "BOLT", "company", companyId);
    assert.equal(owner?.quantity, "0.000");
    assert.equal(owner?.inventoryValue, "0.000");
    assert.equal(owner?.pendingQuantity, "4.000");

    const after = await legacySnapshot(tx);
    assert.deepEqual(after, before);
    const journals = await tx.query.stockMovements.findMany({ where: eq(stockMovements.companyId, companyId) });
    assert.equal(journals.every((movement) => movement.journalId == null), true);
  });
});

test("customer-owned stock stays out of the company balance", async () => {
  await rolled(async (tx) => {
    const site = await places(tx);
    await postDocument(tx, {
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "2.000", unitCost: "1.000" }],
    });
    await postDocument(tx, {
      kind: "receipt",
      purpose: "receipt",
      ownership: "customer",
      ownerId: customerId,
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "7.000", unitCost: "5.000" }],
    });
    await postDocument(tx, {
      kind: "dispatch",
      purpose: "sale",
      ownership: "customer",
      ownerId: customerId,
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "3.000" }],
    });
    const company = await ownerBalance(tx, "SHARED", "company", companyId);
    const customer = await ownerBalance(tx, "SHARED", "customer", customerId);
    assert.equal(company?.quantity, "2.000");
    assert.equal(company?.inventoryValue, "2.000");
    assert.equal(customer?.quantity, "4.000");
    assert.equal(customer?.inventoryValue, "0.000");
    assert.equal(customer?.averageCost, "0.000");
  });
});

test("a warehouse transfer moves location quantity and not owner value", async () => {
  await rolled(async (tx) => {
    const site = await places(tx);
    await postDocument(tx, {
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "CRATE", quantity: "5.000", unitCost: "2.000" }],
    });
    const moved = await postDocument(tx, {
      kind: "transfer",
      purpose: "transfer",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      toWarehouseId: site.secondWarehouse,
      toLocationId: site.secondLocation,
      lines: [{ lineKey: "1", sku: "CRATE", quantity: "2.000" }],
    });
    assert.equal(moved.movementIds.length, 2);
    assert.equal(moved.journalIds.length, 0);
    const owner = await ownerBalance(tx, "CRATE", "company", companyId);
    assert.equal(owner?.quantity, "5.000");
    assert.equal(owner?.inventoryValue, "10.000");
    const source = await locationBalance(tx, "CRATE", site.main);
    const destination = await locationBalance(tx, "CRATE", site.secondLocation);
    assert.equal(source?.quantity, "3.000");
    assert.equal(destination?.quantity, "2.000");
    await reverseStockDocument(tx, moved.id, actor(false), "2026-10-29");
    assert.equal((await locationBalance(tx, "CRATE", site.main))?.quantity, "5.000");
    assert.equal((await locationBalance(tx, "CRATE", site.secondLocation))?.quantity, "0.000");
    assert.equal((await ownerBalance(tx, "CRATE", "company", companyId))?.inventoryValue, "10.000");
  });
});

test("posting the same document twice does not duplicate movements or journals", async () => {
  await rolled(async (tx) => {
    const before = await legacySnapshot(tx);
    const site = await places(tx);
    const draft = await createStockDraft(tx, {
      id: "phase1-doc-retry",
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      movedOn: "2026-10-29",
      lines: [
        { lineKey: "1", sku: "NUT", quantity: "1.000", unitCost: "1.000", idempotencyKey: "nut-line-1" },
        { lineKey: "2", sku: "NUT", quantity: "1.000", unitCost: "2.000", idempotencyKey: "nut-line-2" },
      ],
      actor: actor(false),
    });
    const retry = await createStockDraft(tx, {
      id: "phase1-doc-retry",
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      movedOn: "2026-10-29",
      lines: [{ lineKey: "1", sku: "NUT", quantity: "9.000", unitCost: "9.000", idempotencyKey: "nut-line-1" }],
      actor: actor(false),
    });
    assert.equal(retry.created, false);
    await approveStockDocument(tx, draft.id, actor(false));
    const first = await postStockDocument(tx, draft.id, actor(false));
    const second = await postStockDocument(tx, draft.id, actor(false));
    assert.equal(second.movementIds.length, 2);
    assert.deepEqual([...second.movementIds].sort(), [...first.movementIds].sort());
    assert.deepEqual(second.journalIds, []);
    const owner = await ownerBalance(tx, "NUT", "company", companyId);
    assert.equal(owner?.quantity, "2.000");
    assert.equal(owner?.averageCost, "1.500");
    await assert.rejects(() => createStockDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      movedOn: "2026-10-29",
      lines: [{ lineKey: "9", sku: "NUT", quantity: "1.000", unitCost: "1.000", idempotencyKey: "nut-line-1" }],
      actor: actor(false),
    }), /already submitted/);
    const posted = await tx.query.stockDocuments.findFirst({ where: eq(stockDocuments.id, draft.id) });
    await assert.rejects(() => updateStockDraft(tx, {
      id: draft.id,
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      movedOn: "2026-10-29",
      lines: [{ lineKey: "1", sku: "NUT", quantity: "1.000", unitCost: "1.000" }],
      actor: actor(false),
    }), /immutable/);
    assert.equal(posted?.status, "posted");
    const lines = await tx.query.stockDocumentLines.findMany({ where: eq(stockDocumentLines.documentId, draft.id) });
    assert.equal(lines.length, 2);
    const after = await legacySnapshot(tx);
    assert.deepEqual(after, before);
  });
});

test("a closed period blocks valued company stock and still allows customer custody", async () => {
  await rolled(async (tx) => {
    const site = await places(tx);
    await tx.insert(accountingPeriods).values({
      id: crypto.randomUUID(),
      companyId,
      name: "Phase 1 closed",
      startsOn: "2099-01-01",
      endsOn: "2099-12-31",
      status: "closed",
    });
    await assert.rejects(() => postDocument(tx, {
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      movedOn: "2099-06-01",
      lines: [{ lineKey: "1", sku: "LOCKED", quantity: "1.000", unitCost: "1.000" }],
    }), /fiscal period is closed/);
    await postDocument(tx, {
      kind: "receipt",
      purpose: "receipt",
      ownership: "customer",
      ownerId: customerId,
      warehouseId: site.warehouseId,
      locationId: site.main,
      movedOn: "2099-06-01",
      lines: [{ lineKey: "1", sku: "LOCKED", quantity: "1.000" }],
    });
    const company = await ownerBalance(tx, "LOCKED", "company", companyId);
    const customer = await ownerBalance(tx, "LOCKED", "customer", customerId);
    assert.equal(company, undefined);
    assert.equal(customer?.quantity, "1.000");
    assert.equal(customer?.inventoryValue, "0.000");
  });
});

test("opening proposals do not change balances or create movements", async () => {
  await rolled(async (tx) => {
    const before = await legacySnapshot(tx);
    const site = await places(tx);
    const proposal = await recordOpeningProposal(tx, {
      legacyItemId: "legacy-item",
      companyId,
      sku: "OPEN",
      ownership: "company",
      ownerId: companyId,
      warehouseId: site.warehouseId,
      locationId: site.main,
      quantity: "8.000",
      averageCost: "1.250",
      cutoverDate: "2026-10-29",
      legacyMoveQuantities: ["3.000", "9.000"],
      actor: actor(true),
    });
    const again = await recordOpeningProposal(tx, {
      legacyItemId: "legacy-item",
      companyId,
      sku: "OPEN",
      ownership: "company",
      ownerId: companyId,
      warehouseId: site.warehouseId,
      locationId: site.main,
      quantity: "8.000",
      averageCost: "1.250",
      cutoverDate: "2026-10-29",
      actor: actor(true),
    });
    assert.equal(again.id, proposal.id);
    assert.equal(again.created, false);
    await assert.rejects(() => recordOpeningProposal(tx, {
      legacyItemId: "legacy-item",
      companyId,
      sku: "OPEN",
      ownership: "company",
      ownerId: companyId,
      warehouseId: site.warehouseId,
      locationId: site.main,
      quantity: "1.000",
      averageCost: "9.000",
      cutoverDate: "2026-10-29",
      actor: actor(true),
    }), /was not changed/);
    assert.throws(() => postOpeningBalance(), /not created until cutover/);
    const stored = await tx.query.stockOpeningProposals.findFirst({
      where: eq(stockOpeningProposals.id, proposal.id),
    });
    assert.equal(stored?.status, "proposed");
    assert.equal(stored?.quantity, "8.000");
    const balance = await ownerBalance(tx, "OPEN", "company", companyId);
    const movements = await tx.query.stockMovements.findMany({ where: eq(stockMovements.companyId, companyId) });
    assert.equal(balance, undefined);
    assert.equal(movements.length, 0);
    await assert.rejects(() => recordOpeningProposal(tx, {
      legacyItemId: "legacy-item",
      companyId,
      sku: "OPEN",
      ownership: "company",
      ownerId: companyId,
      warehouseId: site.warehouseId,
      locationId: site.main,
      quantity: "8.000",
      averageCost: "1.250",
      cutoverDate: "2026-10-29",
      actor: actor(false),
    }), /accounting authorization/);
    assert.deepEqual(await legacySnapshot(tx), before);
  });
});

test("negative stock needs accounting authorization and an explicit policy", async () => {
  await rolled(async (tx) => {
    const site = await places(tx);
    await assert.rejects(() => setNegativeStockPolicy(tx, {
      companyId,
      sku: "SHORT",
      ownership: "company",
      allowNegative: true,
      actor: actor(false),
    }), /accounting authorization/);
    await setNegativeStockPolicy(tx, {
      companyId,
      sku: "SHORT",
      ownership: "company",
      allowNegative: true,
      actor: actor(true),
    });
    await postDocument(tx, {
      kind: "dispatch",
      purpose: "write_off",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      lines: [{ lineKey: "1", sku: "SHORT", quantity: "1.000" }],
    });
    const owner = await ownerBalance(tx, "SHORT", "company", companyId);
    assert.equal(owner?.allowNegative, 1);
    assert.equal(owner?.quantity, "-1.000");
  });
});

test("a caller without warehouse permission cannot draft stock", async () => {
  await rolled(async (tx) => {
    const site = await places(tx);
    await assert.rejects(() => createStockDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseId: site.warehouseId,
      locationId: site.main,
      movedOn: "2026-10-29",
      lines: [{ lineKey: "1", sku: "NOPE", quantity: "1.000", unitCost: "1.000" }],
      actor: { userId, canOperate: false, canPostFinancial: true },
    }), StockError);
  });
});

async function ownerBalance(tx: StockTx, sku: string, ownership: string, ownerId: string) {
  return tx.query.stockOwnerBalances.findFirst({
    where: and(
      eq(stockOwnerBalances.companyId, companyId),
      eq(stockOwnerBalances.sku, sku),
      eq(stockOwnerBalances.ownership, ownership),
      eq(stockOwnerBalances.ownerId, ownerId),
    ),
  });
}

async function locationBalance(tx: StockTx, sku: string, locationId: string) {
  return tx.query.stockLocationBalances.findFirst({
    where: and(eq(stockLocationBalances.sku, sku), eq(stockLocationBalances.locationId, locationId)),
  });
}
