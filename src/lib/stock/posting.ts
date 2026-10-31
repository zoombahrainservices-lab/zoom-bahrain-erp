import { and, eq, inArray, sql } from "drizzle-orm";

import { canApproveOwn } from "@/lib/accounting/phase3-rules";
import { toFils } from "@/lib/accounting/money";
import { db } from "@/db";
import {
  accountingAudit,
  accountingLocations,
  accountingPeriods,
  accountingWarehouses,
  stockDocumentLines,
  stockDocuments,
  stockLocationBalances,
  stockMovements,
  stockOpeningProposals,
  stockOwnerBalances,
} from "@/db/schema";

import { assertFinancialStockAuthority, assertStockOperator, type StockActor } from "./auth";
import { StockError } from "./errors";
import {
  STOCK_FINANCIAL_POSTING_ENABLED,
  activeJournalDecision,
  assertJournalReversalAllowed,
  assertKindPurpose,
  blocksOnClosedPeriod,
  closedPeriodMessage,
  lineIdempotencyKey,
  locationDelta,
  money,
  movementIdempotencyKey,
  openingPostingBlocked,
  parseQuantity,
  parseUnitCost,
  planLine,
  planReversal,
  proposeOpeningFromLegacy,
  resolveOwnerId,
  valuationFor,
  type OwnerBalance,
  type PlannedMovement,
  type StockDocumentKind,
  type StockOwnership,
  type StockPurpose,
} from "./rules";

export type StockTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function inStockTransaction<T>(work: (tx: StockTx) => Promise<T>) {
  return db.transaction(work);
}

export type StockLineInput = {
  lineKey: string;
  sku: string;
  name?: string;
  unit?: string;
  quantity: string;
  unitCost?: string | null;
  idempotencyKey?: string | null;
};

export type StockDraftInput = {
  id?: string;
  companyId: string;
  kind: StockDocumentKind;
  purpose: StockPurpose;
  ownership: StockOwnership;
  ownerId?: string | null;
  warehouseId: string;
  locationId: string;
  toWarehouseId?: string | null;
  toLocationId?: string | null;
  movedOn: string;
  sourceType?: string;
  sourceId?: string | null;
  procurementEntryId?: string | null;
  billId?: string | null;
  reference?: string;
  counterparty?: string;
  note?: string;
  lines: StockLineInput[];
  actor: StockActor;
};

type OwnerState = OwnerBalance & { id: string };
type LocationState = { id: string; quantity: bigint; pending: bigint };

export async function createStockDraft(tx: StockTx, input: StockDraftInput) {
  assertStockOperator(input.actor);
  assertKindPurpose(input.kind, input.purpose);
  const ownerId = resolveOwnerId(input.companyId, input.ownership, input.ownerId);
  assertDate(input.movedOn);
  if (input.lines.length === 0) throw new StockError("Add at least one stock line.");
  await assertLocation(tx, input.companyId, input.warehouseId, input.locationId);
  if (input.kind === "transfer") {
    if (!input.toWarehouseId || !input.toLocationId) {
      throw new StockError("Choose the destination warehouse and location.");
    }
    await assertLocation(tx, input.companyId, input.toWarehouseId, input.toLocationId);
    if (input.toLocationId === input.locationId) {
      throw new StockError("Choose a different destination location.");
    }
  }

  const id = input.id ?? crypto.randomUUID();
  const existing = await tx.query.stockDocuments.findFirst({ where: eq(stockDocuments.id, id) });
  if (existing) return { id: existing.id, created: false };

  const prepared = prepareLines(input, id);
  await assertFreshLineKeys(tx, prepared.map((line) => line.idempotencyKey));
  await tx.insert(stockDocuments).values({
    id,
    companyId: input.companyId,
    status: "draft",
    kind: input.kind,
    purpose: input.purpose,
    ownership: input.ownership,
    ownerId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
    toWarehouseId: input.toWarehouseId ?? null,
    toLocationId: input.toLocationId ?? null,
    movedOn: input.movedOn,
    sourceType: input.sourceType ?? "",
    sourceId: input.sourceId ?? null,
    procurementEntryId: input.procurementEntryId ?? null,
    billId: input.billId ?? null,
    reference: input.reference?.trim() ?? "",
    counterparty: input.counterparty?.trim() ?? "",
    note: input.note ?? "",
    createdById: input.actor.userId,
  });
  try {
    await tx.insert(stockDocumentLines).values(prepared);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new StockError("This stock line was already submitted.");
    }
    throw error;
  }
  await audit(tx, input.companyId, input.actor.userId, "stock_draft", id, input.purpose);
  return { id, created: true };
}

export async function updateStockDraft(tx: StockTx, input: StockDraftInput & { id: string }) {
  assertStockOperator(input.actor);
  await lockDocument(tx, input.id);
  const document = await requireDocument(tx, input.id);
  if (document.status !== "draft") {
    throw new StockError("Posted stock documents are immutable. Correct them with a reversal.");
  }
  assertKindPurpose(input.kind, input.purpose);
  const ownerId = resolveOwnerId(document.companyId, input.ownership, input.ownerId);
  assertDate(input.movedOn);
  if (input.lines.length === 0) throw new StockError("Add at least one stock line.");
  await assertLocation(tx, document.companyId, input.warehouseId, input.locationId);
  if (input.kind === "transfer") {
    if (!input.toWarehouseId || !input.toLocationId) {
      throw new StockError("Choose the destination warehouse and location.");
    }
    await assertLocation(tx, document.companyId, input.toWarehouseId, input.toLocationId);
    if (input.toLocationId === input.locationId) {
      throw new StockError("Choose a different destination location.");
    }
  }
  const prepared = prepareLines({ ...input, companyId: document.companyId }, document.id);
  await assertFreshLineKeys(tx, prepared.map((line) => line.idempotencyKey), document.id);
  await tx.delete(stockDocumentLines).where(eq(stockDocumentLines.documentId, document.id));
  try {
    await tx.insert(stockDocumentLines).values(prepared);
  } catch (error) {
    if (isUniqueViolation(error)) throw new StockError("This stock line was already submitted.");
    throw error;
  }
  await tx.update(stockDocuments).set({
    kind: input.kind,
    purpose: input.purpose,
    ownership: input.ownership,
    ownerId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
    toWarehouseId: input.toWarehouseId ?? null,
    toLocationId: input.toLocationId ?? null,
    movedOn: input.movedOn,
    sourceType: input.sourceType ?? "",
    sourceId: input.sourceId ?? null,
    procurementEntryId: input.procurementEntryId ?? null,
    billId: input.billId ?? null,
    reference: input.reference?.trim() ?? "",
    counterparty: input.counterparty?.trim() ?? "",
    note: input.note ?? "",
  }).where(eq(stockDocuments.id, document.id));
  await audit(tx, document.companyId, input.actor.userId, "stock_draft_update", document.id, input.purpose);
  return { id: document.id };
}

export async function approveStockDocument(tx: StockTx, documentId: string, actor: StockActor, blockSelf = false) {
  assertStockOperator(actor);
  await lockDocument(tx, documentId);
  const document = await requireDocument(tx, documentId);
  if (document.status === "approved" || document.status === "posted") return { id: document.id, status: document.status };
  if (document.status !== "draft") throw new StockError("Only a draft can be approved.");
  const lines = await tx.query.stockDocumentLines.findMany({
    where: eq(stockDocumentLines.documentId, document.id),
  });
  if (lines.length === 0) throw new StockError("Add at least one stock line.");
  if (!canApproveOwn(actor.userId, document.createdById, blockSelf)) {
    throw new StockError("Someone else must approve this stock document.");
  }
  await tx.update(stockDocuments).set({
    status: "approved",
    approvedById: actor.userId,
    approvedAt: new Date(),
  }).where(eq(stockDocuments.id, document.id));
  await audit(tx, document.companyId, actor.userId, "stock_approve", document.id, document.purpose);
  return { id: document.id, status: "approved" as const };
}

export async function postStockDocument(tx: StockTx, documentId: string, actor: StockActor) {
  assertStockOperator(actor);
  if (STOCK_FINANCIAL_POSTING_ENABLED) {
    throw new StockError("Inventory ledger posting is disabled until procurement and stock capitalization are verified.");
  }
  await lockDocument(tx, documentId);
  const document = await requireDocument(tx, documentId);
  if (document.status === "posted") return postedResult(tx, document.id);
  if (document.status === "reversed") throw new StockError("This document has been reversed.");
  if (document.status !== "approved") throw new StockError("Approve the document before posting.");
  const lines = await tx.query.stockDocumentLines.findMany({
    where: eq(stockDocumentLines.documentId, document.id),
  });
  if (lines.length === 0) throw new StockError("Add at least one stock line.");
  const ordered = [...lines].sort((left, right) => left.sortOrder - right.sortOrder);
  const periods = await tx.query.accountingPeriods.findMany({
    where: eq(accountingPeriods.companyId, document.companyId),
  });
  for (const line of ordered) {
    const valuation = valuationFor(
      document.ownership as StockOwnership,
      document.purpose as StockPurpose,
      line.unitCost == null ? null : parseUnitCost(line.unitCost),
    );
    if (blocksOnClosedPeriod({
      ownership: document.ownership as StockOwnership,
      purpose: document.purpose as StockPurpose,
      valuation,
    })) {
      const blocked = closedPeriodMessage(periods, document.movedOn);
      if (blocked) throw new StockError(blocked);
    }
  }

  const skus = [...new Set(ordered.map((line) => line.sku))].sort();
  const owners = new Map<string, OwnerState>();
  const locations = new Map<string, LocationState>();
  for (const sku of skus) {
    owners.set(sku, await lockedOwner(tx, document, sku));
    locations.set(
      locationKey(sku, document.warehouseId, document.locationId),
      await lockedLocation(tx, document, sku, document.warehouseId, document.locationId),
    );
    if (document.kind === "transfer" && document.toWarehouseId && document.toLocationId) {
      locations.set(
        locationKey(sku, document.toWarehouseId, document.toLocationId),
        await lockedLocation(tx, document, sku, document.toWarehouseId, document.toLocationId),
      );
    }
  }

  const linked = Boolean(document.procurementEntryId || document.billId);
  const inserted: string[] = [];
  for (const line of ordered) {
    const owner = owners.get(line.sku);
    if (!owner) throw new StockError("Stock balance was not locked.");
    const planned = planLine(owner, {
      ownership: document.ownership as StockOwnership,
      purpose: document.purpose as StockPurpose,
      quantity: parseQuantity(line.quantity),
      unitCost: line.unitCost == null ? null : parseUnitCost(line.unitCost),
    });
    owners.set(line.sku, { ...owner, ...planned.next });
    for (const movement of planned.movements) {
      const place = movement.locationRole === "destination"
        ? { warehouseId: document.toWarehouseId, locationId: document.toLocationId }
        : { warehouseId: document.warehouseId, locationId: document.locationId };
      if (!place.warehouseId || !place.locationId) {
        throw new StockError("Choose the destination warehouse and location.");
      }
      const key = locationKey(line.sku, place.warehouseId, place.locationId);
      const location = locations.get(key);
      if (!location) throw new StockError("Storage location balance was not locked.");
      const delta = locationDelta(movement);
      const nextLocation = {
        ...location,
        quantity: location.quantity + delta.quantity,
        pending: location.pending + delta.pending,
      };
      if ((nextLocation.quantity < 0n || nextLocation.pending < 0n) && !owner.allowNegative) {
        throw new StockError("Not enough stock in this storage location.");
      }
      locations.set(key, nextLocation);
      const decision = activeJournalDecision({
        ownership: document.ownership as StockOwnership,
        purpose: document.purpose as StockPurpose,
        valuation: movement.valuation,
        valueImpact: movement.valueImpact,
        linkedProcurementOrBill: linked,
      });
      if (decision.posts) {
        throw new StockError("Inventory ledger posting is disabled until procurement and stock capitalization are verified.");
      }
      const movementId = crypto.randomUUID();
      await tx.insert(stockMovements).values({
        id: movementId,
        companyId: document.companyId,
        documentId: document.id,
        documentLineId: line.id,
        idempotencyKey: movementIdempotencyKey(line.idempotencyKey, movement.direction),
        sku: line.sku,
        itemName: line.itemName,
        unit: line.unit,
        ownership: document.ownership,
        ownerId: document.ownerId,
        warehouseId: place.warehouseId,
        locationId: place.locationId,
        purpose: document.purpose,
        direction: movement.direction,
        ownerEffect: movement.ownerEffect,
        quantity: money(movement.quantity),
        unitCost: movement.unitCost == null ? null : money(movement.unitCost),
        valueImpact: money(movement.valueImpact),
        valuationStatus: movement.valuation,
        postingStatus: "posted",
        movedOn: document.movedOn,
        journalId: null,
        journalDebitCode: decision.debitCode,
        journalCreditCode: decision.creditCode,
        journalBlockReason: decision.reason,
        createdById: document.createdById,
        approvedById: document.approvedById,
      });
      inserted.push(movementId);
    }
  }

  await saveOwners(tx, owners);
  await saveLocations(tx, locations);
  await tx.update(stockDocuments).set({
    status: "posted",
    postedById: actor.userId,
    postedAt: new Date(),
  }).where(eq(stockDocuments.id, document.id));
  await audit(tx, document.companyId, actor.userId, "stock_post", document.id, `${inserted.length} movements`);
  return { id: document.id, movementIds: inserted, journalIds: [] as string[] };
}

export async function reverseStockDocument(tx: StockTx, documentId: string, actor: StockActor, movedOn: string) {
  assertStockOperator(actor);
  assertDate(movedOn);
  await lockDocument(tx, documentId);
  const document = await requireDocument(tx, documentId);
  if (document.reversalOfId) throw new StockError("Reverse the original document instead.");
  if (document.status === "reversed" && document.reversedById) {
    return { id: document.reversedById, movementIds: await movementIds(tx, document.reversedById) };
  }
  if (document.status !== "posted") throw new StockError("Only a posted document can be reversed.");
  const originals = await tx.query.stockMovements.findMany({
    where: eq(stockMovements.documentId, document.id),
  });
  if (originals.some((movement) => movement.reversedById || movement.reversalOfId)) {
    throw new StockError("This document has already been reversed.");
  }
  for (const movement of originals) {
    assertJournalReversalAllowed({
      journalId: movement.journalId,
      financialPostingEnabled: STOCK_FINANCIAL_POSTING_ENABLED,
      canPostFinancial: actor.canPostFinancial,
    });
  }

  const lines = await tx.query.stockDocumentLines.findMany({
    where: eq(stockDocumentLines.documentId, document.id),
  });
  const reversalId = crypto.randomUUID();
  await tx.insert(stockDocuments).values({
    id: reversalId,
    companyId: document.companyId,
    status: "posted",
    kind: document.kind,
    purpose: document.purpose,
    ownership: document.ownership,
    ownerId: document.ownerId,
    warehouseId: document.warehouseId,
    locationId: document.locationId,
    toWarehouseId: document.toWarehouseId,
    toLocationId: document.toLocationId,
    movedOn,
    sourceType: "stock_reversal",
    sourceId: document.id,
    reversalOfId: document.id,
    note: `Reversal of ${document.id}`,
    createdById: actor.userId,
    approvedById: actor.userId,
    postedById: actor.userId,
    approvedAt: new Date(),
    postedAt: new Date(),
  });

  const lineIds = new Map<string, string>();
  for (const line of lines) {
    const id = crypto.randomUUID();
    lineIds.set(line.id, id);
    await tx.insert(stockDocumentLines).values({
      id,
      documentId: reversalId,
      lineKey: line.lineKey,
      idempotencyKey: `${line.idempotencyKey}:reversal`,
      sku: line.sku,
      itemName: line.itemName,
      unit: line.unit,
      quantity: line.quantity,
      unitCost: line.unitCost,
      valuationStatus: line.valuationStatus,
      sortOrder: line.sortOrder,
    });
  }

  const skus = [...new Set(originals.map((movement) => movement.sku))].sort();
  const owners = new Map<string, OwnerState>();
  const locations = new Map<string, LocationState>();
  for (const sku of skus) {
    owners.set(sku, await lockedOwner(tx, document, sku));
  }
  for (const movement of originals) {
    const key = locationKey(movement.sku, movement.warehouseId, movement.locationId);
    if (!locations.has(key)) {
      locations.set(
        key,
        await lockedLocation(tx, document, movement.sku, movement.warehouseId, movement.locationId),
      );
    }
  }

  const inserted: string[] = [];
  for (const movement of originals) {
    const owner = owners.get(movement.sku);
    if (!owner) throw new StockError("Stock balance was not locked.");
    const quantity = parseQuantity(movement.quantity);
    const valueImpact = movement.valueImpact ? signedFils(movement.valueImpact) : 0n;
    const nextOwner = planReversal(owner, {
      ownership: document.ownership as StockOwnership,
      ownerEffect: movement.ownerEffect as PlannedMovement["ownerEffect"],
      quantity,
      valueImpact,
    });
    owners.set(movement.sku, { ...owner, ...nextOwner });
    const flipped: PlannedMovement = {
      direction: movement.direction === "in" ? "out" : "in",
      locationRole: "source",
      ownerEffect: flipEffect(movement.ownerEffect as PlannedMovement["ownerEffect"]),
      quantity,
      unitCost: movement.unitCost == null ? null : signedFils(movement.unitCost),
      valueImpact: -valueImpact,
      valuation: movement.valuationStatus as PlannedMovement["valuation"],
    };
    const key = locationKey(movement.sku, movement.warehouseId, movement.locationId);
    const location = locations.get(key);
    if (!location) throw new StockError("Storage location balance was not locked.");
    const delta = locationDelta(flipped);
    const nextLocation = {
      ...location,
      quantity: location.quantity + delta.quantity,
      pending: location.pending + delta.pending,
    };
    if (nextLocation.quantity < 0n || nextLocation.pending < 0n) {
      throw new StockError("Reversal would make the location stock negative.");
    }
    locations.set(key, nextLocation);
    const reversalMovementId = crypto.randomUUID();
    const lineId = lineIds.get(movement.documentLineId);
    if (!lineId) throw new StockError("The stock line for this reversal is missing.");
    await tx.insert(stockMovements).values({
      id: reversalMovementId,
      companyId: document.companyId,
      documentId: reversalId,
      documentLineId: lineId,
      idempotencyKey: `${movement.idempotencyKey}:reversal`,
      sku: movement.sku,
      itemName: movement.itemName,
      unit: movement.unit,
      ownership: movement.ownership,
      ownerId: movement.ownerId,
      warehouseId: movement.warehouseId,
      locationId: movement.locationId,
      purpose: movement.purpose,
      direction: flipped.direction,
      ownerEffect: flipped.ownerEffect,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      valueImpact: money(-valueImpact),
      valuationStatus: movement.valuationStatus,
      postingStatus: "posted",
      movedOn,
      journalId: null,
      journalDebitCode: movement.journalCreditCode,
      journalCreditCode: movement.journalDebitCode,
      journalBlockReason: movement.journalId
        ? "Financial reversal stays disabled until ledger posting is verified."
        : "Reversal of a movement that was not posted to the ledger.",
      reversalOfId: movement.id,
      createdById: actor.userId,
      approvedById: actor.userId,
    });
    await tx.update(stockMovements).set({ reversedById: reversalMovementId }).where(eq(stockMovements.id, movement.id));
    inserted.push(reversalMovementId);
  }

  await saveOwners(tx, owners);
  await saveLocations(tx, locations);
  await tx.update(stockDocuments).set({
    status: "reversed",
    reversedById: reversalId,
  }).where(eq(stockDocuments.id, document.id));
  await audit(tx, document.companyId, actor.userId, "stock_reverse", document.id, reversalId);
  return { id: reversalId, movementIds: inserted };
}

export async function recordOpeningProposal(tx: StockTx, input: Parameters<typeof proposeOpeningFromLegacy>[0] & {
  actor: StockActor;
  note?: string;
}) {
  assertFinancialStockAuthority(input.actor);
  const proposal = proposeOpeningFromLegacy(input);
  assertDate(proposal.cutoverDate);
  await assertLocation(tx, proposal.companyId, proposal.warehouseId, proposal.locationId);
  const existing = await tx.query.stockOpeningProposals.findFirst({
    where: and(
      eq(stockOpeningProposals.companyId, proposal.companyId),
      eq(stockOpeningProposals.sku, proposal.sku),
      eq(stockOpeningProposals.ownership, proposal.ownership),
      eq(stockOpeningProposals.ownerId, proposal.ownerId),
      eq(stockOpeningProposals.warehouseId, proposal.warehouseId),
      eq(stockOpeningProposals.locationId, proposal.locationId),
      eq(stockOpeningProposals.cutoverDate, proposal.cutoverDate),
    ),
  });
  if (existing) {
    if (signedFils(existing.quantity) !== proposal.quantity || signedFils(existing.averageCost) !== proposal.averageCost) {
      throw new StockError("An opening proposal already exists and was not changed.");
    }
    return { id: existing.id, created: false };
  }
  const id = crypto.randomUUID();
  try {
    await tx.insert(stockOpeningProposals).values({
      id,
      companyId: proposal.companyId,
      sku: proposal.sku,
      ownership: proposal.ownership,
      ownerId: proposal.ownerId,
      warehouseId: proposal.warehouseId,
      locationId: proposal.locationId,
      quantity: money(proposal.quantity),
      averageCost: money(proposal.averageCost),
      cutoverDate: proposal.cutoverDate,
      legacyItemId: proposal.legacyItemId,
      status: "proposed",
      note: input.note ?? "Proposed from the legacy item balance. Legacy movements were not replayed.",
      createdById: input.actor.userId,
    });
    return { id, created: true };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await tx.query.stockOpeningProposals.findFirst({
      where: and(
        eq(stockOpeningProposals.companyId, proposal.companyId),
        eq(stockOpeningProposals.sku, proposal.sku),
        eq(stockOpeningProposals.ownership, proposal.ownership),
        eq(stockOpeningProposals.ownerId, proposal.ownerId),
        eq(stockOpeningProposals.warehouseId, proposal.warehouseId),
        eq(stockOpeningProposals.locationId, proposal.locationId),
        eq(stockOpeningProposals.cutoverDate, proposal.cutoverDate),
      ),
    });
    if (!existing) throw error;
    if (signedFils(existing.quantity) !== proposal.quantity || signedFils(existing.averageCost) !== proposal.averageCost) {
      throw new StockError("An opening proposal already exists and was not changed.");
    }
    return { id: existing.id, created: false };
  }
}

export function postOpeningBalance(): never {
  openingPostingBlocked();
}

export async function setNegativeStockPolicy(tx: StockTx, input: {
  companyId: string;
  sku: string;
  ownership: StockOwnership;
  ownerId?: string | null;
  allowNegative: boolean;
  actor: StockActor;
}) {
  assertFinancialStockAuthority(input.actor);
  const ownerId = resolveOwnerId(input.companyId, input.ownership, input.ownerId);
  const sku = input.sku.trim();
  await lockBalance(tx, input.companyId, sku, input.ownership, ownerId);
  const existing = await tx.query.stockOwnerBalances.findFirst({
    where: and(
      eq(stockOwnerBalances.companyId, input.companyId),
      eq(stockOwnerBalances.sku, sku),
      eq(stockOwnerBalances.ownership, input.ownership),
      eq(stockOwnerBalances.ownerId, ownerId),
    ),
  });
  if (!existing) {
    await tx.insert(stockOwnerBalances).values({
      id: crypto.randomUUID(),
      companyId: input.companyId,
      sku,
      ownership: input.ownership,
      ownerId,
      quantity: "0.000",
      pendingQuantity: "0.000",
      averageCost: "0.000",
      inventoryValue: "0.000",
      allowNegative: input.allowNegative ? 1 : 0,
    });
    return;
  }
  await tx.update(stockOwnerBalances).set({
    allowNegative: input.allowNegative ? 1 : 0,
  }).where(eq(stockOwnerBalances.id, existing.id));
}

async function assertFreshLineKeys(tx: StockTx, keys: string[], documentId?: string) {
  if (keys.length === 0) return;
  const rows = await tx.select({
    documentId: stockDocumentLines.documentId,
  }).from(stockDocumentLines).where(inArray(stockDocumentLines.idempotencyKey, keys));
  if (rows.some((row) => row.documentId !== documentId)) {
    throw new StockError("This stock line was already submitted.");
  }
}

async function postedResult(tx: StockTx, documentId: string) {
  return { id: documentId, movementIds: await movementIds(tx, documentId), journalIds: [] as string[] };
}

async function movementIds(tx: StockTx, documentId: string) {
  const rows = await tx.query.stockMovements.findMany({
    where: eq(stockMovements.documentId, documentId),
  });
  return rows.map((row) => row.id);
}

function prepareLines(input: StockDraftInput, documentId: string) {
  const seen = new Set<string>();
  return input.lines.map((line, index) => {
    const lineKey = line.lineKey.trim();
    const sku = line.sku.trim();
    if (!lineKey || !sku) throw new StockError("Each line needs a line key and a SKU.");
    if (seen.has(lineKey)) throw new StockError("Each line key must be unique on the document.");
    seen.add(lineKey);
    const quantity = parseQuantity(line.quantity);
    const unitCost = parseUnitCost(line.unitCost);
    const ownership = input.ownership;
    const purpose = input.purpose;
    return {
      id: crypto.randomUUID(),
      documentId,
      lineKey,
      idempotencyKey: lineIdempotencyKey(input.companyId, documentId, lineKey, line.idempotencyKey),
      sku,
      itemName: line.name?.trim() || sku,
      unit: line.unit?.trim() || "ea",
      quantity: money(quantity),
      unitCost: unitCost == null ? null : money(unitCost),
      valuationStatus: valuationFor(ownership, purpose, unitCost),
      sortOrder: index,
    };
  });
}

async function lockedOwner(tx: StockTx, document: {
  companyId: string;
  ownership: string;
  ownerId: string;
}, sku: string): Promise<OwnerState> {
  await lockBalance(tx, document.companyId, sku, document.ownership, document.ownerId);
  await tx.insert(stockOwnerBalances).values({
    id: crypto.randomUUID(),
    companyId: document.companyId,
    sku,
    ownership: document.ownership,
    ownerId: document.ownerId,
    quantity: "0.000",
    pendingQuantity: "0.000",
    averageCost: "0.000",
    inventoryValue: "0.000",
    allowNegative: 0,
  }).onConflictDoNothing({
    target: [
      stockOwnerBalances.companyId,
      stockOwnerBalances.sku,
      stockOwnerBalances.ownership,
      stockOwnerBalances.ownerId,
    ],
  });
  const rows = await tx.select().from(stockOwnerBalances).where(and(
    eq(stockOwnerBalances.companyId, document.companyId),
    eq(stockOwnerBalances.sku, sku),
    eq(stockOwnerBalances.ownership, document.ownership),
    eq(stockOwnerBalances.ownerId, document.ownerId),
  )).for("update");
  const row = rows[0];
  if (!row) throw new StockError("Stock balance was not saved.");
  return {
    id: row.id,
    quantity: signedFils(row.quantity),
    pending: signedFils(row.pendingQuantity),
    average: signedFils(row.averageCost),
    value: signedFils(row.inventoryValue),
    allowNegative: row.allowNegative === 1,
  };
}

async function lockedLocation(tx: StockTx, document: {
  companyId: string;
  ownership: string;
  ownerId: string;
}, sku: string, warehouseId: string, locationId: string): Promise<LocationState> {
  await tx.insert(stockLocationBalances).values({
    id: crypto.randomUUID(),
    companyId: document.companyId,
    sku,
    ownership: document.ownership,
    ownerId: document.ownerId,
    warehouseId,
    locationId,
    quantity: "0.000",
    pendingQuantity: "0.000",
  }).onConflictDoNothing({
    target: [
      stockLocationBalances.companyId,
      stockLocationBalances.sku,
      stockLocationBalances.ownership,
      stockLocationBalances.ownerId,
      stockLocationBalances.warehouseId,
      stockLocationBalances.locationId,
    ],
  });
  const rows = await tx.select().from(stockLocationBalances).where(and(
    eq(stockLocationBalances.companyId, document.companyId),
    eq(stockLocationBalances.sku, sku),
    eq(stockLocationBalances.ownership, document.ownership),
    eq(stockLocationBalances.ownerId, document.ownerId),
    eq(stockLocationBalances.warehouseId, warehouseId),
    eq(stockLocationBalances.locationId, locationId),
  )).for("update");
  const row = rows[0];
  if (!row) throw new StockError("Storage location balance was not saved.");
  return { id: row.id, quantity: signedFils(row.quantity), pending: signedFils(row.pendingQuantity) };
}

async function saveOwners(tx: StockTx, owners: Map<string, OwnerState>) {
  for (const state of owners.values()) {
    await tx.update(stockOwnerBalances).set({
      quantity: money(state.quantity),
      pendingQuantity: money(state.pending),
      averageCost: money(state.average),
      inventoryValue: money(state.value),
    }).where(eq(stockOwnerBalances.id, state.id));
  }
}

async function saveLocations(tx: StockTx, locations: Map<string, LocationState>) {
  for (const state of locations.values()) {
    await tx.update(stockLocationBalances).set({
      quantity: money(state.quantity),
      pendingQuantity: money(state.pending),
    }).where(eq(stockLocationBalances.id, state.id));
  }
}

async function assertLocation(tx: StockTx, companyId: string, warehouseId: string, locationId: string) {
  const warehouse = await tx.query.accountingWarehouses.findFirst({
    where: eq(accountingWarehouses.id, warehouseId),
  });
  if (!warehouse || warehouse.companyId !== companyId) {
    throw new StockError("Choose a warehouse for this company.");
  }
  const location = await tx.query.accountingLocations.findFirst({
    where: eq(accountingLocations.id, locationId),
  });
  if (!location || location.warehouseId !== warehouse.id) {
    throw new StockError("Choose a storage location in that warehouse.");
  }
}

async function requireDocument(tx: StockTx, id: string) {
  const document = await tx.query.stockDocuments.findFirst({ where: eq(stockDocuments.id, id) });
  if (!document) throw new StockError("Stock document not found.");
  return document;
}

async function lockDocument(tx: StockTx, documentId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`stock-doc:${documentId}`}))`);
}

async function lockBalance(tx: StockTx, companyId: string, sku: string, ownership: string, ownerId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`stock-bal:${companyId}:${sku}:${ownership}:${ownerId}`}))`);
}

async function audit(tx: StockTx, companyId: string, actorId: string, action: string, entityId: string, detail: string) {
  await tx.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId,
    actorId,
    action,
    entityType: "stock_document",
    entityId,
    detail,
  });
}

function assertDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new StockError("Choose a valid date.");
}

function locationKey(sku: string, warehouseId: string, locationId: string) {
  return `${sku}:${warehouseId}:${locationId}`;
}

function flipEffect(effect: PlannedMovement["ownerEffect"]): PlannedMovement["ownerEffect"] {
  if (effect === "quantity_in") return "quantity_out";
  if (effect === "quantity_out") return "quantity_in";
  if (effect === "pending_in") return "pending_out";
  if (effect === "pending_out") return "pending_in";
  return "none";
}

function signedFils(value: string) {
  return toFils(value);
}

function isUniqueViolation(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && (current as { code: unknown }).code === "23505") return true;
    const message = current instanceof Error ? current.message : "";
    if (message.toLowerCase().includes("duplicate key")) return true;
    current = "cause" in current ? (current as { cause: unknown }).cause : null;
  }
  return false;
}
