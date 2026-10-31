import { and, eq, sql } from "drizzle-orm";

import { AccountingError, toFils } from "@/lib/accounting/money";
import {
  accountingLocations,
  accountingWarehouses,
  operationEntries,
  organizations,
  stockDocuments,
  stockDocumentLines,
  stockMovements,
  stockOwnerBalances,
} from "@/db/schema";

import { assertFinancialStockAuthority, assertStockOperator, type StockActor } from "./auth";
import { StockError } from "./errors";
import { explainDocumentPost } from "./operational-rules";
import {
  approveStockDocument,
  createStockDraft,
  postStockDocument,
  reverseStockDocument,
  updateStockDraft,
  type StockDraftInput,
  type StockLineInput,
  type StockTx,
} from "./posting";
import { LEDGER_POSTING_DISABLED, type StockDocumentKind, type StockOwnership, type StockPurpose } from "./rules";

const noteTypes = new Set(["receiving", "storage", "dispatch"]);

export type OperationalDraftInput = {
  id?: string;
  companyId: string;
  kind: StockDocumentKind;
  purpose: StockPurpose;
  ownership: StockOwnership;
  ownerId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  warehouseName?: string | null;
  locationName?: string | null;
  toWarehouseId?: string | null;
  toLocationId?: string | null;
  toWarehouseName?: string | null;
  toLocationName?: string | null;
  movedOn: string;
  reference?: string;
  counterparty?: string;
  note?: string;
  sourceEntryId?: string | null;
  procurementEntryId?: string | null;
  billId?: string | null;
  lines: StockLineInput[];
  actor: StockActor;
};

export async function saveOperationalDraft(tx: StockTx, input: OperationalDraftInput) {
  assertStockOperator(input.actor);
  assertAdjustmentAuthority(input.actor, input.kind, input.purpose);
  if (input.ownership === "customer") await assertCustomerOwner(tx, input.ownerId);
  const source = await operationLink(tx, input.sourceEntryId);
  const place = await resolvePlace(tx, input.companyId, input.warehouseId, input.locationId, input.warehouseName, input.locationName);
  const destination = input.kind === "transfer"
    ? await resolvePlace(tx, input.companyId, input.toWarehouseId, input.toLocationId, input.toWarehouseName, input.toLocationName)
    : { warehouseId: null, locationId: null };
  const draft: StockDraftInput = {
    id: input.id,
    companyId: input.companyId,
    kind: input.kind,
    purpose: input.purpose,
    ownership: input.ownership,
    ownerId: input.ownerId,
    warehouseId: place.warehouseId,
    locationId: place.locationId,
    toWarehouseId: destination.warehouseId,
    toLocationId: destination.locationId,
    movedOn: input.movedOn,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    procurementEntryId: input.procurementEntryId,
    billId: input.billId,
    reference: input.reference ?? "",
    counterparty: input.counterparty ?? "",
    note: input.note ?? "",
    lines: input.lines,
    actor: input.actor,
  };
  if (input.id) {
    const existing = await tx.query.stockDocuments.findFirst({ where: eq(stockDocuments.id, input.id) });
    if (existing) {
      if (existing.companyId !== input.companyId) throw new StockError("This document belongs to another company.");
      if (existing.status !== "draft") {
        throw new StockError("Posted stock documents are immutable. Correct them with a reversal.");
      }
      await updateStockDraft(tx, { ...draft, id: existing.id, companyId: existing.companyId });
      return { id: existing.id, created: false, status: "draft" as const };
    }
  }
  const created = await createStockDraft(tx, draft);
  return { id: created.id, created: created.created, status: "draft" as const };
}

export async function approveOperationalDocument(tx: StockTx, documentId: string, actor: StockActor) {
  assertStockOperator(actor);
  const document = await requireOperationalDocument(tx, documentId);
  assertAdjustmentAuthority(actor, document.kind as StockDocumentKind, document.purpose as StockPurpose);
  return approveStockDocument(tx, document.id, actor);
}

export async function postOperationalDocument(
  tx: StockTx,
  documentId: string,
  actor: StockActor,
  confirmZeroCost = false,
) {
  assertStockOperator(actor);
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`stock-doc:${documentId}`}))`);
  const document = await requireOperationalDocument(tx, documentId);
  if (document.status === "posted") return postStockDocument(tx, document.id, actor);
  assertAdjustmentAuthority(actor, document.kind as StockDocumentKind, document.purpose as StockPurpose);
  if (document.status !== "approved") throw new StockError("Approve the document before posting.");
  const lines = await tx.query.stockDocumentLines.findMany({
    where: eq(stockDocumentLines.documentId, document.id),
  });
  const skus = [...new Set(lines.map((line) => line.sku))];
  const balances = [];
  for (const sku of skus) {
    const rows = await tx.select().from(stockOwnerBalances).where(and(
      eq(stockOwnerBalances.companyId, document.companyId),
      eq(stockOwnerBalances.sku, sku),
      eq(stockOwnerBalances.ownership, document.ownership),
      eq(stockOwnerBalances.ownerId, document.ownerId),
    )).for("update");
    const row = rows[0];
    balances.push({
      sku,
      quantity: row?.quantity ?? "0.000",
      pending: row?.pendingQuantity ?? "0.000",
      average: row?.averageCost ?? "0.000",
      value: row?.inventoryValue ?? "0.000",
      allowNegative: row?.allowNegative === 1,
    });
  }
  explainDocumentPost({
    ownership: document.ownership as StockOwnership,
    purpose: document.purpose as StockPurpose,
    linkedProcurementOrBill: Boolean(document.procurementEntryId || document.billId),
    confirmZeroCost,
    canPostFinancial: actor.canPostFinancial,
    lines: lines.map((line) => ({
      sku: line.sku,
      quantity: line.quantity,
      unitCost: line.unitCost,
      sortOrder: line.sortOrder,
    })),
    balances,
  });
  return postStockDocument(tx, document.id, actor);
}

export async function reverseOperationalDocument(tx: StockTx, documentId: string, actor: StockActor, movedOn: string) {
  assertStockOperator(actor);
  const document = await requireOperationalDocument(tx, documentId);
  assertAdjustmentAuthority(actor, document.kind as StockDocumentKind, document.purpose as StockPurpose);
  if (document.ownership === "company" && document.status === "posted") {
    const movements = await tx.query.stockMovements.findMany({
      where: eq(stockMovements.documentId, document.id),
    });
    const valued = movements.some((movement) => movement.valuationStatus === "valued" && toFils(movement.valueImpact) !== 0n);
    if (valued) throw new StockError(LEDGER_POSTING_DISABLED);
    const zeroValued = movements.some((movement) => movement.valuationStatus === "valued");
    if (zeroValued) assertFinancialStockAuthority(actor);
  }
  return reverseStockDocument(tx, document.id, actor, movedOn);
}

async function requireOperationalDocument(tx: StockTx, documentId: string) {
  const document = await tx.query.stockDocuments.findFirst({ where: eq(stockDocuments.id, documentId) });
  if (!document) throw new StockError("Stock document not found.");
  return document;
}

function assertAdjustmentAuthority(actor: StockActor, kind: string, purpose: string) {
  if (kind === "adjustment" || purpose === "write_off") assertFinancialStockAuthority(actor);
}

async function assertCustomerOwner(tx: StockTx, ownerId?: string | null) {
  const id = ownerId?.trim() ?? "";
  if (!id) throw new StockError("Choose the customer who owns this stock.");
  const owner = await tx.query.organizations.findFirst({ where: eq(organizations.id, id) });
  if (!owner) throw new StockError("Choose a customer organization.");
}

async function operationLink(tx: StockTx, sourceEntryId?: string | null) {
  const id = sourceEntryId?.trim() ?? "";
  if (!id) return { sourceType: "", sourceId: null as string | null };
  const entry = await tx.query.operationEntries.findFirst({ where: eq(operationEntries.id, id) });
  if (!entry || !noteTypes.has(entry.entryType)) {
    throw new StockError("Link a receiving, storage, or dispatch note, or leave the link empty.");
  }
  return { sourceType: "operation_entry", sourceId: entry.id };
}

async function resolvePlace(
  tx: StockTx,
  companyId: string,
  warehouseId?: string | null,
  locationId?: string | null,
  warehouseName?: string | null,
  locationName?: string | null,
) {
  if (warehouseId && locationId) return { warehouseId, locationId };
  if (warehouseId) {
    const warehouse = await tx.query.accountingWarehouses.findFirst({ where: eq(accountingWarehouses.id, warehouseId) });
    if (!warehouse || warehouse.companyId !== companyId) throw new StockError("Choose a warehouse for this company.");
    const name = locationName?.trim() ?? "";
    if (!name) throw new StockError("Choose a storage location in that warehouse.");
    let location = await tx.query.accountingLocations.findFirst({
      where: and(eq(accountingLocations.warehouseId, warehouse.id), eq(accountingLocations.name, name)),
    });
    if (!location) {
      const id = crypto.randomUUID();
      await tx.insert(accountingLocations).values({ id, warehouseId: warehouse.id, name });
      location = await tx.query.accountingLocations.findFirst({ where: eq(accountingLocations.id, id) });
    }
    if (!location) throw new StockError("Choose a storage location in that warehouse.");
    return { warehouseId: warehouse.id, locationId: location.id };
  }
  return ensureStockPlace(tx, companyId, warehouseName ?? "", locationName ?? "");
}

export async function ensureStockPlace(tx: StockTx, companyId: string, warehouseName: string, locationName: string) {
  const name = warehouseName.trim();
  const place = locationName.trim() || "Main";
  if (!name) throw new StockError("Enter a warehouse.");
  let warehouse = await tx.query.accountingWarehouses.findFirst({
    where: and(eq(accountingWarehouses.companyId, companyId), eq(accountingWarehouses.name, name)),
  });
  if (!warehouse) {
    const id = crypto.randomUUID();
    await tx.insert(accountingWarehouses).values({ id, companyId, name });
    warehouse = await tx.query.accountingWarehouses.findFirst({ where: eq(accountingWarehouses.id, id) });
  }
  if (!warehouse || warehouse.companyId !== companyId) throw new StockError("Choose a warehouse for this company.");
  let location = await tx.query.accountingLocations.findFirst({
    where: and(eq(accountingLocations.warehouseId, warehouse.id), eq(accountingLocations.name, place)),
  });
  if (!location) {
    const id = crypto.randomUUID();
    await tx.insert(accountingLocations).values({ id, warehouseId: warehouse.id, name: place });
    location = await tx.query.accountingLocations.findFirst({ where: eq(accountingLocations.id, id) });
  }
  if (!location || location.warehouseId !== warehouse.id) throw new StockError("Choose a storage location in that warehouse.");
  return { warehouseId: warehouse.id, locationId: location.id };
}

export function stockActionStatus(error: unknown) {
  if (error instanceof AccountingError) return { status: 403, error: error.message };
  if (error instanceof StockError) {
    const forbidden = /permission|authorization|authorised|authorized/i.test(error.message);
    return { status: forbidden ? 403 : 400, error: error.message };
  }
  return null;
}
