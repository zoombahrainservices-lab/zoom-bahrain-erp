import { issueCost } from "@/lib/accounting/phase3-rules";
import { filsToAmount, toFils } from "@/lib/accounting/money";

import { reconcileStockToLedger } from "./rules";

export function stockStatus(input: { posted: string; pending: string; awaitingDispatch: string }) {
  const posted = toFils(input.posted || "0");
  const pending = toFils(input.pending || "0");
  const awaiting = toFils(input.awaitingDispatch || "0");
  if (pending > 0n && posted === 0n) return "Pending valuation";
  if (posted > 0n && pending > 0n) return "Posted, with pending valuation";
  if (posted > 0n) return "Posted";
  if (awaiting > 0n) return "Dispatch awaiting post";
  return "No posted stock";
}

export function compareLegacyAndSubledger(input: {
  legacyQuantity: string;
  legacyAverage: string;
  subledgerQuantity: string;
  subledgerValue: string;
}) {
  const legacyValue = issueCost(toFils(input.legacyQuantity || "0"), toFils(input.legacyAverage || "0"));
  const subledgerValue = toFils(input.subledgerValue || "0");
  const reconciliation = reconcileStockToLedger(subledgerValue, legacyValue);
  const legacyQuantity = toFils(input.legacyQuantity || "0");
  const subledgerQuantity = toFils(input.subledgerQuantity || "0");
  let status = "Separate records";
  if (legacyQuantity === 0n && subledgerQuantity === 0n && reconciliation.difference === 0n) status = "No quantity in either record";
  else if (legacyQuantity !== 0n && subledgerQuantity === 0n) status = "Not migrated";
  else if (legacyQuantity === 0n && subledgerQuantity !== 0n) status = "Subledger only";
  else if (reconciliation.status === "matched") status = "Matched";
  return {
    legacyQuantity: input.legacyQuantity,
    legacyAverage: input.legacyAverage,
    legacyValue: filsToAmount(legacyValue),
    subledgerQuantity: input.subledgerQuantity,
    subledgerValue: filsToAmount(subledgerValue),
    difference: filsToAmount(reconciliation.difference),
    status,
    combined: false as const,
  };
}

export function documentStatusLabel(status: string) {
  if (status === "draft") return "Draft";
  if (status === "approved") return "Approved";
  if (status === "posted") return "Posted";
  if (status === "reversed") return "Reversed";
  return status;
}

export function ownershipLabel(ownership: string) {
  return ownership === "customer" ? "Customer-owned" : "Company-owned";
}
