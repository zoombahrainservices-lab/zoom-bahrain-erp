import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { filsToAmount, toFils } from "@/lib/accounting/money";
import { db } from "@/db";
import {
  accountingItems,
  accountingLocations,
  accountingWarehouses,
  organizations,
  stockDocumentLines,
  stockDocuments,
  stockLocationBalances,
  stockMovements,
  stockOwnerBalances,
} from "@/db/schema";
import { listDeskEntries } from "@/lib/list-work-desk";

import { compareLegacyAndSubledger, stockStatus } from "./display";
import { explainDocumentPost } from "./operational-rules";
import type { StockOwnership, StockPurpose } from "./rules";

export type StockOverviewRow = {
  sku: string;
  name: string;
  unit: string;
  ownership: string;
  ownerId: string;
  ownerName: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationName: string;
  postedQuantity: string;
  pendingQuantity: string;
  awaitingDispatch: string;
  availableQuantity: string;
  latestMovement: string;
  status: string;
};

export type StockDeskDocument = {
  id: string;
  status: string;
  kind: string;
  purpose: string;
  ownership: string;
  ownerId: string;
  ownerName: string;
  warehouseId: string;
  locationId: string;
  warehouseName: string;
  locationName: string;
  toWarehouseName: string;
  toLocationName: string;
  movedOn: string;
  reference: string;
  counterparty: string;
  note: string;
  sourceId: string | null;
  reversalOfId: string | null;
  reversedById: string | null;
  postBlock: string | null;
  lines: Array<{
    lineKey: string;
    sku: string;
    name: string;
    unit: string;
    quantity: string;
    unitCost: string | null;
    valuation: string;
  }>;
};

export async function loadInventoryDesk(companyId: string, viewer?: { canPostFinancial?: boolean }) {
  const [warehouseRows, balanceRows, ownerRows, documents, customers, notes] = await Promise.all([
    db.query.accountingWarehouses.findMany({ where: eq(accountingWarehouses.companyId, companyId) }),
    db.query.stockLocationBalances.findMany({
      where: eq(stockLocationBalances.companyId, companyId),
      limit: 300,
    }),
    db.query.stockOwnerBalances.findMany({ where: eq(stockOwnerBalances.companyId, companyId), limit: 300 }),
    db.query.stockDocuments.findMany({
      where: eq(stockDocuments.companyId, companyId),
      orderBy: [desc(stockDocuments.createdAt)],
      limit: 80,
    }),
    db.query.organizations.findMany({
      columns: { id: true, name: true },
      orderBy: [asc(organizations.name)],
      limit: 200,
    }),
    listDeskEntries(["receiving", "storage", "dispatch"]),
  ]);
  const warehouseIds = warehouseRows.map((row) => row.id);
  const locationRows = warehouseIds.length
    ? await db.query.accountingLocations.findMany({
      where: inArray(accountingLocations.warehouseId, warehouseIds),
    })
    : [];
  const documentIds = documents.map((row) => row.id);
  const lineRows = documentIds.length
    ? await db.query.stockDocumentLines.findMany({
      where: inArray(stockDocumentLines.documentId, documentIds),
    })
    : [];
  const movements = await db.query.stockMovements.findMany({
    where: eq(stockMovements.companyId, companyId),
    orderBy: [desc(stockMovements.createdAt)],
    limit: 300,
  });
  const names = new Map(customers.map((row) => [row.id, row.name]));
  const warehouseNames = new Map(warehouseRows.map((row) => [row.id, row.name]));
  const locationNames = new Map(locationRows.map((row) => [row.id, row.name]));
  const awaiting = awaitingDispatch(documents, lineRows);
  const overview = balanceRows.map((row) => {
    const latest = movements.find((movement) =>
      movement.sku === row.sku &&
      movement.ownerId === row.ownerId &&
      movement.warehouseId === row.warehouseId &&
      movement.locationId === row.locationId
    );
    const waiting = awaiting.get(balanceKey(row)) ?? "0.000";
    const name = movements.find((movement) => movement.sku === row.sku && movement.ownerId === row.ownerId)?.itemName
      ?? lineRows.find((line) => line.sku === row.sku)?.itemName
      ?? "";
    return {
      sku: row.sku,
      name,
      unit: latest?.unit ?? "ea",
      ownership: row.ownership,
      ownerId: row.ownerId,
      ownerName: row.ownership === "company" ? "Company" : names.get(row.ownerId) ?? row.ownerId,
      warehouseId: row.warehouseId,
      warehouseName: warehouseNames.get(row.warehouseId) ?? "",
      locationId: row.locationId,
      locationName: locationNames.get(row.locationId) ?? "",
      postedQuantity: row.quantity,
      pendingQuantity: row.pendingQuantity,
      awaitingDispatch: waiting,
      availableQuantity: row.quantity,
      latestMovement: latest ? `${latest.movedOn} · ${latest.purpose}` : "",
      status: stockStatus({ posted: row.quantity, pending: row.pendingQuantity, awaitingDispatch: waiting }),
    } satisfies StockOverviewRow;
  });
  const deskDocuments: StockDeskDocument[] = documents.map((document) => {
    const lines = lineRows
      .filter((line) => line.documentId === document.id)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const postBlock = document.status === "approved"
      ? blockFor(document, lines, ownerRows, viewer?.canPostFinancial === true)
      : null;
    return {
      id: document.id,
      status: document.status,
      kind: document.kind,
      purpose: document.purpose,
      ownership: document.ownership,
      ownerId: document.ownerId,
      ownerName: document.ownership === "company" ? "Company" : names.get(document.ownerId) ?? document.ownerId,
      warehouseId: document.warehouseId,
      locationId: document.locationId,
      warehouseName: warehouseNames.get(document.warehouseId) ?? "",
      locationName: locationNames.get(document.locationId) ?? "",
      toWarehouseName: document.toWarehouseId ? warehouseNames.get(document.toWarehouseId) ?? "" : "",
      toLocationName: document.toLocationId ? locationNames.get(document.toLocationId) ?? "" : "",
      movedOn: document.movedOn,
      reference: document.reference,
      counterparty: document.counterparty,
      note: document.note,
      sourceId: document.sourceId,
      reversalOfId: document.reversalOfId,
      reversedById: document.reversedById,
      postBlock,
      lines: lines.map((line) => ({
        lineKey: line.lineKey,
        sku: line.sku,
        name: line.itemName,
        unit: line.unit,
        quantity: line.quantity,
        unitCost: line.unitCost,
        valuation: line.valuationStatus,
      })),
    };
  });
  return {
    companyId,
    customers: customers.map((row) => ({ id: row.id, name: row.name })),
    warehouses: warehouseRows.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      locations: locationRows
        .filter((location) => location.warehouseId === warehouse.id)
        .map((location) => ({ id: location.id, name: location.name })),
    })),
    notes: notes.map((entry) => ({
      id: entry.id,
      entryType: entry.entryType,
      label: `${entry.entryType} · ${entry.operation?.title ?? entry.id}`,
    })),
    overview,
    documents: deskDocuments,
    historicalNoteCount: notes.length,
  };
}

export async function loadStockSubledger(companyId: string | "all") {
  const companyFilter = companyId === "all" ? undefined : eq(stockOwnerBalances.companyId, companyId);
  const legacyFilter = companyId === "all" ? undefined : eq(accountingItems.companyId, companyId);
  const [owners, items, movements] = await Promise.all([
    db.query.stockOwnerBalances.findMany({
      where: companyFilter ? and(companyFilter, eq(stockOwnerBalances.ownership, "company")) : eq(stockOwnerBalances.ownership, "company"),
      limit: 200,
    }),
    db.query.accountingItems.findMany({
      where: legacyFilter,
      limit: 200,
    }),
    db.query.stockMovements.findMany({
      where: companyId === "all"
        ? eq(stockMovements.ownership, "company")
        : and(eq(stockMovements.companyId, companyId), eq(stockMovements.ownership, "company")),
      orderBy: [desc(stockMovements.createdAt)],
      limit: 300,
    }),
  ]);
  const legacyCompany = items.filter((item) => item.ownership === "company");
  const keys = new Set<string>();
  for (const item of legacyCompany) keys.add(`${item.companyId}:${item.sku}`);
  for (const owner of owners) keys.add(`${owner.companyId}:${owner.sku}`);
  const rows = [...keys].map((key) => {
    const [itemCompany, sku] = splitKey(key);
    const legacy = legacyCompany.find((item) => item.companyId === itemCompany && item.sku === sku);
    const subledger = owners.find((owner) => owner.companyId === itemCompany && owner.sku === sku);
    const latest = movements.find((movement) => movement.companyId === itemCompany && movement.sku === sku);
    const compared = compareLegacyAndSubledger({
      legacyQuantity: legacy?.quantity ?? "0.000",
      legacyAverage: legacy?.averageCost ?? "0.000",
      subledgerQuantity: subledger?.quantity ?? "0.000",
      subledgerValue: subledger?.inventoryValue ?? "0.000",
    });
    return {
      companyId: itemCompany,
      sku,
      name: legacy?.name || latest?.itemName || "",
      ...compared,
      subledgerAverage: subledger?.averageCost ?? "0.000",
      pendingQuantity: subledger?.pendingQuantity ?? "0.000",
      latestMovement: latest ? `${latest.movedOn} · ${latest.purpose}` : "",
      journalId: latest?.journalId ?? null,
      journalReference: latest?.journalId
        ? latest.journalId
        : latest
          ? "No journal"
          : "",
      journalBlockReason: latest?.journalBlockReason ?? "",
      postingStatus: latest ? "Posted to the subledger" : "No new movement",
    };
  });
  return rows;
}

function blockFor(
  document: {
    ownership: string;
    ownerId: string;
    purpose: string;
    procurementEntryId: string | null;
    billId: string | null;
  },
  lines: Array<{ sku: string; quantity: string; unitCost: string | null; sortOrder: number }>,
  owners: Array<{
    sku: string;
    ownership: string;
    ownerId: string;
    quantity: string;
    pendingQuantity: string;
    averageCost: string;
    inventoryValue: string;
    allowNegative: number;
  }>,
  canPostFinancial: boolean,
) {
  try {
    explainDocumentPost({
      ownership: document.ownership as StockOwnership,
      purpose: document.purpose as StockPurpose,
      linkedProcurementOrBill: Boolean(document.procurementEntryId || document.billId),
      confirmZeroCost: canPostFinancial,
      canPostFinancial,
      lines,
      balances: owners
        .filter((row) => row.ownership === document.ownership && row.ownerId === document.ownerId)
        .map((row) => ({
          sku: row.sku,
          quantity: row.quantity,
          pending: row.pendingQuantity,
          average: row.averageCost,
          value: row.inventoryValue,
          allowNegative: row.allowNegative === 1,
        })),
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "This document cannot be posted.";
  }
}

function awaitingDispatch(
  documents: Array<{ id: string; status: string; kind: string; ownership: string; ownerId: string; warehouseId: string; locationId: string }>,
  lines: Array<{ documentId: string; sku: string; quantity: string }>,
) {
  const totals = new Map<string, bigint>();
  for (const document of documents) {
    if (document.kind !== "dispatch" || (document.status !== "draft" && document.status !== "approved")) continue;
    for (const line of lines) {
      if (line.documentId !== document.id) continue;
      const key = `${document.ownership}:${document.ownerId}:${line.sku}:${document.warehouseId}:${document.locationId}`;
      totals.set(key, (totals.get(key) ?? 0n) + toFils(line.quantity));
    }
  }
  const formatted = new Map<string, string>();
  for (const [key, value] of totals) formatted.set(key, filsToAmount(value));
  return formatted;
}

function balanceKey(row: { ownership: string; ownerId: string; sku: string; warehouseId: string; locationId: string }) {
  return `${row.ownership}:${row.ownerId}:${row.sku}:${row.warehouseId}:${row.locationId}`;
}

function splitKey(key: string) {
  const index = key.indexOf(":");
  return [key.slice(0, index), key.slice(index + 1)] as const;
}
