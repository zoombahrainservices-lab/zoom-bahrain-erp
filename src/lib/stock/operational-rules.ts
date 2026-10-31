import { toFils } from "@/lib/accounting/money";

import { StockError } from "./errors";
import {
  LEDGER_POSTING_DISABLED,
  emptyOwnerBalance,
  isInbound,
  journalDecision,
  parseQuantity,
  parseUnitCost,
  planLine,
  type OwnerBalance,
  type StockOwnership,
  type StockPurpose,
} from "./rules";

export const ZERO_COST_CONFIRMATION =
  "A zero unit cost is a real valuation. Leave the cost blank for pending valuation, or confirm zero with accounting authorization.";

export const LINKED_CAPITALIZATION_BLOCKED =
  "This receipt is linked to procurement or a supplier bill. Stock capitalization stays off until that link is verified.";

export function applyOperationalLine(input: {
  ownership: StockOwnership;
  purpose: StockPurpose;
  quantity: string;
  unitCost: string | null;
  balance: OwnerBalance;
  linkedProcurementOrBill: boolean;
  confirmZeroCost: boolean;
  canPostFinancial: boolean;
}) {
  const unitCost = parseUnitCost(input.unitCost);
  const planned = planLine(input.balance, {
    ownership: input.ownership,
    purpose: input.purpose,
    quantity: parseQuantity(input.quantity),
    unitCost,
  });
  for (const movement of planned.movements) {
    const decision = journalDecision({
      ownership: input.ownership,
      purpose: input.purpose,
      valuation: movement.valuation,
      valueImpact: movement.valueImpact,
      linkedProcurementOrBill: input.linkedProcurementOrBill,
      financialPostingEnabled: true,
    });
    if (decision.posts) throw new StockError(LEDGER_POSTING_DISABLED);
  }
  if (
    input.ownership === "company" &&
    input.linkedProcurementOrBill &&
    input.purpose === "receipt" &&
    unitCost !== null
  ) {
    throw new StockError(LINKED_CAPITALIZATION_BLOCKED);
  }
  if (input.ownership === "company" && isInbound(input.purpose) && unitCost === 0n) {
    if (!input.confirmZeroCost || !input.canPostFinancial) throw new StockError(ZERO_COST_CONFIRMATION);
  }
  return planned.next;
}

export function explainDocumentPost(input: {
  ownership: StockOwnership;
  purpose: StockPurpose;
  linkedProcurementOrBill: boolean;
  confirmZeroCost: boolean;
  canPostFinancial: boolean;
  lines: Array<{ sku: string; quantity: string; unitCost: string | null; sortOrder: number }>;
  balances: Array<{ sku: string; quantity: string; pending: string; average: string; value: string; allowNegative: boolean }>;
}) {
  const balances = new Map<string, OwnerBalance>();
  for (const row of input.balances) {
    balances.set(row.sku, {
      quantity: toFils(row.quantity || "0"),
      pending: toFils(row.pending || "0"),
      average: toFils(row.average || "0"),
      value: toFils(row.value || "0"),
      allowNegative: row.allowNegative,
    });
  }
  const ordered = [...input.lines].sort((left, right) => left.sortOrder - right.sortOrder);
  for (const line of ordered) {
    const current = balances.get(line.sku) ?? emptyOwnerBalance();
    const next = applyOperationalLine({
      ownership: input.ownership,
      purpose: input.purpose,
      quantity: line.quantity,
      unitCost: line.unitCost,
      balance: current,
      linkedProcurementOrBill: input.linkedProcurementOrBill,
      confirmZeroCost: input.confirmZeroCost,
      canPostFinancial: input.canPostFinancial,
    });
    balances.set(line.sku, next);
  }
  return balances;
}
