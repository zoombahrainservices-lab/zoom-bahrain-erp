import assert from "node:assert/strict";
import test from "node:test";
import { and, eq, sql } from "drizzle-orm";

import { closeDatabase, db } from "@/db";
import {
  accountingLocations,
  accountingWarehouses,
  organizations,
  stockDocuments,
  stockMovements,
  stockOwnerBalances,
} from "@/db/schema";

import type { StockActor } from "./auth";
import {
  approveOperationalDocument,
  postOperationalDocument,
  reverseOperationalDocument,
  saveOperationalDraft,
  stockActionStatus,
} from "./operational";
import { StockError } from "./errors";
import type { StockTx } from "./posting";

class Rollback extends Error {}

const companyId = "stock-phase2-test";
let userId = "";

test("stock API errors keep permission failures separate from validation failures", () => {
  assert.equal(stockActionStatus(new StockError("You do not have permission to record warehouse stock."))?.status, 403);
  assert.equal(stockActionStatus(new StockError("Not enough customer stock for this movement."))?.status, 400);
  assert.equal(stockActionStatus(new Error("other")), null);
});

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
  const items = await tx.execute(sql`SELECT count(*)::text AS n, coalesce(sum(quantity), 0)::text AS qty FROM accounting_items`);
  const moves = await tx.execute(sql`SELECT count(*)::text AS n FROM accounting_stock_moves`);
  const journals = await tx.execute(sql`SELECT count(*)::text AS n FROM accounting_journals`);
  const notes = await tx.execute(sql`SELECT count(*)::text AS n FROM operation_entries WHERE entry_type IN ('receiving', 'storage', 'dispatch')`);
  return { items: first(items), moves: first(moves), journals: first(journals), notes: first(notes) };
}

function first(rows: unknown) {
  const list = Array.isArray(rows)
    ? rows
    : rows && typeof rows === "object" && "rows" in rows
      ? (rows as { rows: unknown[] }).rows
      : [];
  return list[0] as { n: string; qty?: string };
}

async function customer(tx: StockTx, id: string, name: string) {
  await tx.insert(organizations).values({ id, name });
}

test("customer receipts, dispatches, transfers, and reversals stay isolated from company assets", async () => {
  await rolled(async (tx) => {
    const before = await legacySnapshot(tx);
    const alpha = "phase2-customer-a";
    const beta = "phase2-customer-b";
    await customer(tx, alpha, "Phase 2 Alpha");
    await customer(tx, beta, "Phase 2 Beta");
    const received = await saveOperationalDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "customer",
      ownerId: alpha,
      warehouseName: "Phase 2 shed",
      locationName: "Aisle",
      movedOn: "2026-10-31",
      reference: "GR-1",
      counterparty: "Alpha receiving",
      lines: [
        { lineKey: "1", sku: "SHARED", name: "Shared crate", quantity: "4.000", unit: "ea" },
        { lineKey: "2", sku: "OTHER", name: "Other crate", quantity: "1.000", unit: "ea" },
      ],
      actor: actor(),
    });
    assert.equal(received.status, "draft");
    const draftBalance = await ownerRow(tx, "SHARED", "customer", alpha);
    assert.equal(draftBalance, undefined);
    await approveOperationalDocument(tx, received.id, actor());
    const approved = await tx.query.stockDocuments.findFirst({ where: eq(stockDocuments.id, received.id) });
    assert.equal(approved?.status, "approved");
    assert.equal(approved?.reference, "GR-1");
    assert.equal(await ownerRow(tx, "SHARED", "customer", alpha), undefined);
    const posted = await postOperationalDocument(tx, received.id, actor());
    const again = await postOperationalDocument(tx, received.id, actor());
    assert.deepEqual([...again.movementIds].sort(), [...posted.movementIds].sort());
    assert.equal(posted.journalIds.length, 0);
    const alphaShared = await ownerRow(tx, "SHARED", "customer", alpha);
    const alphaOther = await ownerRow(tx, "OTHER", "customer", alpha);
    assert.equal(alphaShared?.quantity, "4.000");
    assert.equal(alphaShared?.inventoryValue, "0.000");
    assert.equal(alphaOther?.quantity, "1.000");
    const moves = await tx.query.stockMovements.findMany({ where: eq(stockMovements.documentId, received.id) });
    assert.equal(moves.every((movement) => movement.journalId == null), true);

    await saveOperationalDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "customer",
      ownerId: beta,
      warehouseName: "Phase 2 shed",
      locationName: "Aisle",
      movedOn: "2026-10-31",
      reference: "GR-2",
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "9.000" }],
      actor: actor(),
    }).then(async (draft) => {
      await approveOperationalDocument(tx, draft.id, actor());
      await postOperationalDocument(tx, draft.id, actor());
    });
    assert.equal((await ownerRow(tx, "SHARED", "customer", alpha))?.quantity, "4.000");
    assert.equal((await ownerRow(tx, "SHARED", "customer", beta))?.quantity, "9.000");
    assert.equal(await ownerRow(tx, "SHARED", "company", companyId), undefined);

    const sent = await saveOperationalDraft(tx, {
      companyId,
      kind: "dispatch",
      purpose: "other",
      ownership: "customer",
      ownerId: alpha,
      warehouseName: "Phase 2 shed",
      locationName: "Aisle",
      movedOn: "2026-10-31",
      reference: "GD-1",
      counterparty: "Alpha site",
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "1.000" }],
      actor: actor(),
    });
    await approveOperationalDocument(tx, sent.id, actor());
    await postOperationalDocument(tx, sent.id, actor());
    assert.equal((await ownerRow(tx, "SHARED", "customer", alpha))?.quantity, "3.000");
    assert.equal((await ownerRow(tx, "SHARED", "customer", beta))?.quantity, "9.000");
    await assert.rejects(() => saveOperationalDraft(tx, {
      companyId,
      kind: "dispatch",
      purpose: "sale",
      ownership: "customer",
      ownerId: alpha,
      warehouseName: "Phase 2 shed",
      locationName: "Aisle",
      movedOn: "2026-10-31",
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "20.000" }],
      actor: actor(),
    }).then(async (draft) => {
      await approveOperationalDocument(tx, draft.id, actor());
      await postOperationalDocument(tx, draft.id, actor());
    }), /Not enough customer stock/);

    const warehouse = await tx.query.accountingWarehouses.findFirst({
      where: and(eq(accountingWarehouses.companyId, companyId), eq(accountingWarehouses.name, "Phase 2 shed")),
    });
    const aisle = await tx.query.accountingLocations.findFirst({
      where: and(eq(accountingLocations.warehouseId, warehouse?.id ?? ""), eq(accountingLocations.name, "Aisle")),
    });
    const remote = await saveOperationalDraft(tx, {
      companyId,
      kind: "transfer",
      purpose: "transfer",
      ownership: "customer",
      ownerId: alpha,
      warehouseId: warehouse?.id,
      locationId: aisle?.id,
      toWarehouseName: "Phase 2 remote",
      toLocationName: "Dock",
      movedOn: "2026-10-31",
      reference: "GT-1",
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "1.000" }],
      actor: actor(),
    });
    await approveOperationalDocument(tx, remote.id, actor());
    await postOperationalDocument(tx, remote.id, actor());
    assert.equal((await ownerRow(tx, "SHARED", "customer", alpha))?.quantity, "3.000");
    assert.equal((await ownerRow(tx, "SHARED", "customer", alpha))?.inventoryValue, "0.000");
    await reverseOperationalDocument(tx, sent.id, actor(), "2026-10-31");
    assert.equal((await ownerRow(tx, "SHARED", "customer", alpha))?.quantity, "4.000");
    const reversal = await tx.query.stockDocuments.findFirst({ where: eq(stockDocuments.reversalOfId, sent.id) });
    assert.ok(reversal);
    await assert.rejects(() => saveOperationalDraft(tx, {
      id: received.id,
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "customer",
      ownerId: alpha,
      warehouseName: "Phase 2 shed",
      locationName: "Aisle",
      movedOn: "2026-10-31",
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "1.000" }],
      actor: actor(),
    }), /immutable/);
    await assert.rejects(() => saveOperationalDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "customer",
      ownerId: alpha,
      warehouseId: "missing-warehouse",
      locationId: "missing-location",
      movedOn: "2026-10-31",
      lines: [{ lineKey: "1", sku: "SHARED", quantity: "1.000" }],
      actor: actor(),
    }), /warehouse/);
    assert.deepEqual(await legacySnapshot(tx), before);
  });
});

test("company movements that need a journal stay approved and do not change posted quantity", async () => {
  await rolled(async (tx) => {
    const before = await legacySnapshot(tx);
    const draft = await saveOperationalDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseName: "Phase 2 company",
      locationName: "Main",
      movedOn: "2026-10-31",
      reference: "GR-CO",
      lines: [{ lineKey: "1", sku: "BOLT", name: "Bolt", quantity: "2.000", unitCost: "1.500" }],
      actor: actor(),
    });
    await approveOperationalDocument(tx, draft.id, actor());
    await assert.rejects(() => postOperationalDocument(tx, draft.id, actor()), /Inventory ledger posting is disabled/);
    const document = await tx.query.stockDocuments.findFirst({ where: eq(stockDocuments.id, draft.id) });
    assert.equal(document?.status, "approved");
    assert.equal(await ownerRow(tx, "BOLT", "company", companyId), undefined);
    const pending = await saveOperationalDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseName: "Phase 2 company",
      locationName: "Main",
      movedOn: "2026-10-31",
      reference: "GR-PENDING",
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "3.000", unitCost: null }],
      actor: actor(),
    });
    await approveOperationalDocument(tx, pending.id, actor());
    await postOperationalDocument(tx, pending.id, actor());
    const owner = await ownerRow(tx, "BOLT", "company", companyId);
    assert.equal(owner?.quantity, "0.000");
    assert.equal(owner?.pendingQuantity, "3.000");
    assert.equal(owner?.inventoryValue, "0.000");
    await assert.rejects(() => saveOperationalDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "customer",
      ownerId: "",
      warehouseName: "Phase 2 company",
      locationName: "Main",
      movedOn: "2026-10-31",
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "1.000" }],
      actor: actor(),
    }), /customer/i);
    await assert.rejects(() => saveOperationalDraft(tx, {
      companyId,
      kind: "receipt",
      purpose: "receipt",
      ownership: "company",
      warehouseName: "Phase 2 company",
      locationName: "Main",
      movedOn: "2026-10-31",
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "1.000", unitCost: "1.000" }],
      actor: { userId, canOperate: false, canPostFinancial: true },
    }), /permission/);
    await assert.rejects(() => saveOperationalDraft(tx, {
      companyId,
      kind: "adjustment",
      purpose: "adjustment_out",
      ownership: "company",
      warehouseName: "Phase 2 company",
      locationName: "Main",
      movedOn: "2026-10-31",
      lines: [{ lineKey: "1", sku: "BOLT", quantity: "1.000" }],
      actor: actor(false),
    }), /accounting authorization/);
    assert.deepEqual(await legacySnapshot(tx), before);
  });
});

test("two connections cannot double-post one customer receipt", async () => {
  if (!userId) throw new Error("No user is available for the stock integration test.");
  const raceCompany = "stock-phase2-race";
  const ownerId = crypto.randomUUID();
  const documentId = crypto.randomUUID();
  const beforeItems = await db.execute(sql`SELECT count(*)::text AS n, coalesce(sum(quantity), 0)::text AS qty FROM accounting_items`);
  const beforeJournals = await db.execute(sql`SELECT count(*)::text AS n FROM accounting_journals`);
  try {
    await db.transaction(async (tx) => {
      await customer(tx, ownerId, "Phase 2 race customer");
      await saveOperationalDraft(tx, {
        id: documentId,
        companyId: raceCompany,
        kind: "receipt",
        purpose: "receipt",
        ownership: "customer",
        ownerId,
        warehouseName: "Race shed",
        locationName: "Main",
        movedOn: "2026-10-31",
        reference: "RACE-1",
        lines: [{ lineKey: "1", sku: "RACE", quantity: "1.000", idempotencyKey: `race-${documentId}` }],
        actor: actor(),
      });
      await approveOperationalDocument(tx, documentId, actor());
    });
    const results = await Promise.all([
      db.transaction((tx) => postOperationalDocument(tx, documentId, actor())),
      db.transaction((tx) => postOperationalDocument(tx, documentId, actor())),
    ]);
    const owner = await db.query.stockOwnerBalances.findFirst({
      where: and(
        eq(stockOwnerBalances.companyId, raceCompany),
        eq(stockOwnerBalances.sku, "RACE"),
        eq(stockOwnerBalances.ownerId, ownerId),
      ),
    });
    const movements = await db.query.stockMovements.findMany({
      where: eq(stockMovements.companyId, raceCompany),
    });
    assert.equal(owner?.quantity, "1.000");
    assert.equal(owner?.inventoryValue, "0.000");
    assert.equal(movements.length, 1);
    assert.equal(new Set(results.flatMap((result) => result.movementIds)).size, 1);
    assert.deepEqual(first(await db.execute(sql`SELECT count(*)::text AS n, coalesce(sum(quantity), 0)::text AS qty FROM accounting_items`)), first(beforeItems));
    assert.deepEqual(first(await db.execute(sql`SELECT count(*)::text AS n FROM accounting_journals`)), first(beforeJournals));
  } finally {
    await db.execute(sql`DELETE FROM stock_movements WHERE company_id = ${raceCompany}`);
    await db.execute(sql`DELETE FROM stock_document_lines WHERE document_id IN (SELECT id FROM stock_documents WHERE company_id = ${raceCompany})`);
    await db.execute(sql`DELETE FROM stock_documents WHERE company_id = ${raceCompany}`);
    await db.execute(sql`DELETE FROM stock_location_balances WHERE company_id = ${raceCompany}`);
    await db.execute(sql`DELETE FROM stock_owner_balances WHERE company_id = ${raceCompany}`);
    await db.execute(sql`DELETE FROM accounting_locations WHERE warehouse_id IN (SELECT id FROM accounting_warehouses WHERE company_id = ${raceCompany})`);
    await db.execute(sql`DELETE FROM accounting_warehouses WHERE company_id = ${raceCompany}`);
    await db.execute(sql`DELETE FROM accounting_audit WHERE company_id = ${raceCompany} AND entity_type = 'stock_document'`);
    await db.execute(sql`DELETE FROM organizations WHERE id = ${ownerId}`);
  }
});

async function ownerRow(tx: StockTx, sku: string, ownership: string, ownerId: string) {
  return tx.query.stockOwnerBalances.findFirst({
    where: and(
      eq(stockOwnerBalances.companyId, companyId),
      eq(stockOwnerBalances.sku, sku),
      eq(stockOwnerBalances.ownership, ownership),
      eq(stockOwnerBalances.ownerId, ownerId),
    ),
  });
}
