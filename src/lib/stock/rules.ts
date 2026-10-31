import { issueCost, movingAverage } from "@/lib/accounting/phase3-rules";
import { filsToAmount, toFils } from "@/lib/accounting/money";

import { StockError } from "./errors";

/** New inventory journals stay off until procurement and stock capitalization are verified. */
export const STOCK_FINANCIAL_POSTING_ENABLED = false;

export const LEDGER_POSTING_DISABLED =
  "Inventory ledger posting is disabled until procurement and stock capitalization are verified.";

export const stockDocumentKinds = ["receipt", "dispatch", "transfer", "return", "adjustment"] as const;
export type StockDocumentKind = (typeof stockDocumentKinds)[number];

export const stockPurposes = [
  "receipt",
  "sale",
  "consumption",
  "supplier_return",
  "write_off",
  "other",
  "transfer",
  "customer_return",
  "adjustment_in",
  "adjustment_out",
] as const;
export type StockPurpose = (typeof stockPurposes)[number];

export type StockOwnership = "company" | "customer";
export type ValuationStatus = "valued" | "pending" | "not_applicable";
export type OwnerEffect = "quantity_in" | "quantity_out" | "pending_in" | "pending_out" | "none";

export type OwnerBalance = {
  quantity: bigint;
  pending: bigint;
  average: bigint;
  value: bigint;
  allowNegative: boolean;
};

export type PlannedMovement = {
  direction: "in" | "out";
  locationRole: "source" | "destination";
  ownerEffect: OwnerEffect;
  quantity: bigint;
  unitCost: bigint | null;
  valueImpact: bigint;
  valuation: ValuationStatus;
};

const purposesByKind: Record<StockDocumentKind, readonly StockPurpose[]> = {
  receipt: ["receipt"],
  dispatch: ["sale", "consumption", "supplier_return", "write_off", "other"],
  transfer: ["transfer"],
  return: ["customer_return"],
  adjustment: ["adjustment_in", "adjustment_out"],
};

export function assertKindPurpose(kind: StockDocumentKind, purpose: StockPurpose) {
  if (!purposesByKind[kind].includes(purpose)) {
    throw new StockError(`${purpose} is not a ${kind} movement.`);
  }
}

export function resolveOwnerId(companyId: string, ownership: StockOwnership, ownerId?: string | null) {
  if (ownership === "company") {
    const resolved = ownerId?.trim() || companyId;
    if (resolved !== companyId) {
      throw new StockError("Company-owned stock is owned by that company.");
    }
    return resolved;
  }
  const resolved = ownerId?.trim() ?? "";
  if (!resolved) throw new StockError("Choose the customer who owns this stock.");
  if (resolved === companyId) {
    throw new StockError("Customer-owned stock needs the customer, not the company, as owner.");
  }
  return resolved;
}

export function lineIdempotencyKey(
  companyId: string,
  documentId: string,
  lineKey: string,
  explicit?: string | null,
) {
  const supplied = explicit?.trim();
  if (supplied) return `${companyId}:line:${supplied}`;
  return `${companyId}:doc:${documentId}:${lineKey}`;
}

export function movementIdempotencyKey(lineKey: string, direction: "in" | "out") {
  return `${lineKey}:${direction}`;
}

export function emptyOwnerBalance(allowNegative = false): OwnerBalance {
  return { quantity: 0n, pending: 0n, average: 0n, value: 0n, allowNegative };
}

export function parseQuantity(value: string) {
  const quantity = toFils(value);
  if (quantity <= 0n) throw new StockError("Enter a quantity greater than zero.");
  return quantity;
}

/** Blank cost is pending. Zero is a real cost and is valued. */
export function parseUnitCost(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const cost = toFils(trimmed);
  if (cost < 0n) throw new StockError("Unit cost cannot be negative.");
  return cost;
}

export function valuationFor(ownership: StockOwnership, purpose: StockPurpose, unitCost: bigint | null): ValuationStatus {
  if (ownership === "customer" || purpose === "transfer") return "not_applicable";
  if (isInbound(purpose) && unitCost == null) return "pending";
  return "valued";
}

export function isInbound(purpose: StockPurpose) {
  return purpose === "receipt" || purpose === "customer_return" || purpose === "adjustment_in";
}

export function closedPeriodMessage(
  periods: Array<{ startsOn: string; endsOn: string; status: string }>,
  entryDate: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) return "Choose a valid date.";
  const matches = periods.filter((period) => period.startsOn <= entryDate && period.endsOn >= entryDate);
  if (matches.length > 1) return "More than one fiscal period covers this date.";
  if (matches.length === 1 && matches[0].status === "closed") return "This fiscal period is closed.";
  return null;
}

export function blocksOnClosedPeriod(input: {
  ownership: StockOwnership;
  purpose: StockPurpose;
  valuation: ValuationStatus;
}) {
  if (input.ownership !== "company") return false;
  if (input.purpose === "transfer") return false;
  if (input.valuation === "pending") return false;
  return true;
}

type IntendedJournal = { debitCode: string; creditCode: string };

function intendedJournal(purpose: StockPurpose): IntendedJournal | null {
  switch (purpose) {
    case "receipt":
      return { debitCode: "1200", creditCode: "2000" };
    case "sale":
      return { debitCode: "5610", creditCode: "1200" };
    case "consumption":
    case "write_off":
    case "adjustment_out":
    case "other":
      return { debitCode: "5900", creditCode: "1200" };
    case "supplier_return":
      return { debitCode: "2000", creditCode: "1200" };
    case "customer_return":
      return { debitCode: "1200", creditCode: "5610" };
    case "adjustment_in":
      return { debitCode: "1200", creditCode: "5900" };
    default:
      return null;
  }
}

export function journalDecision(input: {
  ownership: StockOwnership;
  purpose: StockPurpose;
  valuation: ValuationStatus;
  valueImpact: bigint;
  linkedProcurementOrBill: boolean;
  financialPostingEnabled: boolean;
}) {
  if (input.ownership === "customer") {
    return {
      posts: false,
      debitCode: null,
      creditCode: null,
      reason: "Customer-owned goods are custody and do not enter inventory assets.",
    };
  }
  if (input.valuation === "pending") {
    return {
      posts: false,
      debitCode: null,
      creditCode: null,
      reason: "Pending valuation is excluded from inventory assets until a cost is recorded.",
    };
  }
  if (input.purpose === "transfer") {
    return {
      posts: false,
      debitCode: null,
      creditCode: null,
      reason: "A location transfer does not change company inventory value.",
    };
  }
  const intended = intendedJournal(input.purpose);
  if (!intended) {
    return {
      posts: false,
      debitCode: null,
      creditCode: null,
      reason: "This purpose has no verified ledger treatment.",
    };
  }
  if ((input.purpose === "receipt" || input.purpose === "supplier_return") && input.linkedProcurementOrBill) {
    return {
      posts: false,
      debitCode: intended.debitCode,
      creditCode: intended.creditCode,
      reason: "A procurement or supplier bill already covers this document, so stock posting will not create another payable.",
    };
  }
  if (input.valueImpact === 0n) {
    return {
      posts: false,
      debitCode: intended.debitCode,
      creditCode: intended.creditCode,
      reason: "A zero value movement does not create a journal.",
    };
  }
  if (!input.financialPostingEnabled) {
    return {
      posts: false,
      debitCode: intended.debitCode,
      creditCode: intended.creditCode,
      reason: LEDGER_POSTING_DISABLED,
    };
  }
  return {
    posts: true,
    debitCode: intended.debitCode,
    creditCode: intended.creditCode,
    reason: "Ledger posting is enabled for this verified treatment.",
  };
}

export function activeJournalDecision(input: Omit<Parameters<typeof journalDecision>[0], "financialPostingEnabled">) {
  return journalDecision({ ...input, financialPostingEnabled: STOCK_FINANCIAL_POSTING_ENABLED });
}

function requireAvailable(onHand: bigint, quantity: bigint, allowNegative: boolean, label: string) {
  if (onHand - quantity < 0n && !allowNegative) {
    throw new StockError(`Not enough ${label} stock for this movement.`);
  }
}

function addValued(balance: OwnerBalance, quantity: bigint, unitCost: bigint) {
  const next = movingAverage(balance.quantity, balance.average, quantity, unitCost);
  const incoming = issueCost(quantity, unitCost);
  return {
    next: { ...balance, quantity: next.quantity, average: next.average, value: balance.value + incoming },
    valueImpact: incoming,
    unitCost,
  };
}

function consumeValued(balance: OwnerBalance, quantity: bigint) {
  requireAvailable(balance.quantity, quantity, balance.allowNegative, "valued");
  const nextQuantity = balance.quantity - quantity;
  let impact = issueCost(quantity, balance.average);
  if (nextQuantity === 0n || impact > balance.value) impact = balance.value;
  return {
    next: {
      ...balance,
      quantity: nextQuantity,
      average: balance.average,
      value: balance.value - impact,
    },
    valueImpact: -impact,
    unitCost: balance.average,
  };
}

export function planLine(balance: OwnerBalance, input: {
  ownership: StockOwnership;
  purpose: StockPurpose;
  quantity: bigint;
  unitCost: bigint | null;
}): { next: OwnerBalance; movements: PlannedMovement[] } {
  const valuation = valuationFor(input.ownership, input.purpose, input.unitCost);
  if (input.purpose === "transfer") {
    requireAvailable(balance.quantity, input.quantity, balance.allowNegative, "located");
    const unitCost = input.ownership === "company" ? balance.average : null;
    const movement = (direction: "in" | "out", locationRole: "source" | "destination"): PlannedMovement => ({
      direction,
      locationRole,
      ownerEffect: "none",
      quantity: input.quantity,
      unitCost,
      valueImpact: 0n,
      valuation: "not_applicable",
    });
    return {
      next: balance,
      movements: [movement("out", "source"), movement("in", "destination")],
    };
  }

  if (input.ownership === "customer") {
    if (isInbound(input.purpose)) {
      return {
        next: { ...balance, quantity: balance.quantity + input.quantity, average: 0n, value: 0n },
        movements: [{
          direction: "in",
          locationRole: "source",
          ownerEffect: "quantity_in",
          quantity: input.quantity,
          unitCost: null,
          valueImpact: 0n,
          valuation: "not_applicable",
        }],
      };
    }
    requireAvailable(balance.quantity, input.quantity, balance.allowNegative, "customer");
    return {
      next: { ...balance, quantity: balance.quantity - input.quantity, average: 0n, value: 0n },
      movements: [{
        direction: "out",
        locationRole: "source",
        ownerEffect: "quantity_out",
        quantity: input.quantity,
        unitCost: null,
        valueImpact: 0n,
        valuation: "not_applicable",
      }],
    };
  }

  if (valuation === "pending") {
    return {
      next: { ...balance, pending: balance.pending + input.quantity },
      movements: [{
        direction: "in",
        locationRole: "source",
        ownerEffect: "pending_in",
        quantity: input.quantity,
        unitCost: null,
        valueImpact: 0n,
        valuation: "pending",
      }],
    };
  }

  if (isInbound(input.purpose)) {
    const added = addValued(balance, input.quantity, input.unitCost ?? 0n);
    return {
      next: added.next,
      movements: [{
        direction: "in",
        locationRole: "source",
        ownerEffect: "quantity_in",
        quantity: input.quantity,
        unitCost: added.unitCost,
        valueImpact: added.valueImpact,
        valuation: "valued",
      }],
    };
  }

  const consumed = consumeValued(balance, input.quantity);
  return {
    next: consumed.next,
    movements: [{
      direction: "out",
      locationRole: "source",
      ownerEffect: "quantity_out",
      quantity: input.quantity,
      unitCost: consumed.unitCost,
      valueImpact: consumed.valueImpact,
      valuation: "valued",
    }],
  };
}

export function planReversal(balance: OwnerBalance, movement: {
  ownership: StockOwnership;
  ownerEffect: OwnerEffect;
  quantity: bigint;
  valueImpact: bigint;
}) {
  if (movement.ownerEffect === "none") return balance;
  if (movement.ownerEffect === "pending_in") {
    requireAvailable(balance.pending, movement.quantity, false, "pending");
    return { ...balance, pending: balance.pending - movement.quantity };
  }
  if (movement.ownerEffect === "pending_out") {
    return { ...balance, pending: balance.pending + movement.quantity };
  }
  if (movement.ownerEffect === "quantity_in") {
    requireAvailable(balance.quantity, movement.quantity, balance.allowNegative, "valued");
    const nextQuantity = balance.quantity - movement.quantity;
    const nextValue = balance.value - movement.valueImpact;
    if (movement.ownership === "customer") {
      if (movement.valueImpact !== 0n || balance.value !== 0n) {
        throw new StockError("Customer-owned stock cannot carry an inventory value.");
      }
      return { ...balance, quantity: nextQuantity, average: 0n, value: 0n };
    }
    if (nextValue < 0n) throw new StockError("Reversal would make the inventory value negative.");
    if (nextQuantity === 0n && nextValue !== 0n) {
      throw new StockError("Reversal would leave an inventory value with no quantity.");
    }
    return {
      ...balance,
      quantity: nextQuantity,
      value: nextValue,
      average: nextQuantity <= 0n ? balance.average : (nextValue * 1000n) / nextQuantity,
    };
  }
  const nextQuantity = balance.quantity + movement.quantity;
  const restored = -movement.valueImpact;
  const nextValue = balance.value + restored;
  if (movement.ownership === "customer") {
    if (movement.valueImpact !== 0n || balance.value !== 0n) {
      throw new StockError("Customer-owned stock cannot carry an inventory value.");
    }
    return { ...balance, quantity: nextQuantity, average: 0n, value: 0n };
  }
  return {
    ...balance,
    quantity: nextQuantity,
    value: nextValue,
    average: nextQuantity <= 0n ? balance.average : (nextValue * 1000n) / nextQuantity,
  };
}

export function locationDelta(movement: PlannedMovement) {
  const sign = movement.direction === "in" ? 1n : -1n;
  if (movement.ownerEffect === "pending_in" || movement.ownerEffect === "pending_out") {
    return { quantity: 0n, pending: sign * movement.quantity };
  }
  return { quantity: sign * movement.quantity, pending: 0n };
}

export function companyStockPosition(rows: Array<{
  ownership: string;
  quantity: bigint;
  pending: bigint;
  value: bigint;
}>) {
  let quantity = 0n;
  let pending = 0n;
  let value = 0n;
  for (const row of rows) {
    if (row.ownership !== "company") continue;
    quantity += row.quantity;
    pending += row.pending;
    value += row.value;
  }
  return { quantity, pending, value, includesPendingInValue: false as const };
}

export function reconcileStockToLedger(subledgerValue: bigint, ledgerInventory: bigint) {
  const difference = subledgerValue - ledgerInventory;
  return {
    difference,
    status: difference === 0n ? "matched" as const : "difference" as const,
  };
}

export function proposeOpeningFromLegacy(input: {
  legacyItemId: string;
  companyId: string;
  sku: string;
  ownership: StockOwnership;
  ownerId: string;
  warehouseId: string;
  locationId: string;
  quantity: string;
  averageCost: string;
  cutoverDate: string;
  legacyMoveQuantities?: string[];
}) {
  const ownerId = resolveOwnerId(input.companyId, input.ownership, input.ownerId);
  return {
    legacyItemId: input.legacyItemId,
    companyId: input.companyId,
    sku: input.sku.trim(),
    ownership: input.ownership,
    ownerId,
    warehouseId: input.warehouseId,
    locationId: input.locationId,
    quantity: parseQuantity(input.quantity),
    averageCost: input.ownership === "company" ? toFils(input.averageCost || "0") : 0n,
    cutoverDate: input.cutoverDate,
    status: "proposed" as const,
    ignoredLegacyMoves: true as const,
    legacyMoveCount: input.legacyMoveQuantities?.length ?? 0,
  };
}

export function openingPostingBlocked(): never {
  throw new StockError("Opening stock movements are not created until cutover is approved.");
}

export function money(fils: bigint) {
  return filsToAmount(fils);
}

export function assertJournalReversalAllowed(input: {
  journalId: string | null;
  financialPostingEnabled: boolean;
  canPostFinancial: boolean;
}) {
  if (!input.journalId) return "no_journal" as const;
  if (!input.financialPostingEnabled) {
    throw new StockError("This movement is linked to a journal, and financial reversal stays disabled until ledger posting is verified.");
  }
  if (!input.canPostFinancial) {
    throw new StockError("Reversing a posted inventory journal requires accounting authorization.");
  }
  return "reverse" as const;
}
