import type { OperationActivityTypeRecord } from "@/lib/operation-activity-types";
import type { OperationEntryRecord } from "@/lib/operation-fields";

export type OperationMoney = {
  incoming: number;
  outgoing: number;
  quoted: number;
};

function amountOf(entry: { amount?: string | number | null }) {
  if (entry.amount === null || entry.amount === undefined || entry.amount === "") {
    return 0;
  }
  const value = typeof entry.amount === "number" ? entry.amount : Number(entry.amount);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function moneyKind(
  entryType: string,
  types: Array<Pick<OperationActivityTypeRecord, "slug" | "moneyKind">>,
) {
  const match = types.find((type) => type.slug === entryType)?.moneyKind;
  if (match) return match;
  if (entryType === "invoice" || entryType === "quotation" || entryType === "proposal") {
    return "in";
  }
  if (entryType === "cost" || entryType === "procurement") return "out";
  return "none";
}

export function getOperationMoney(
  entries: OperationEntryRecord[],
  types: Array<Pick<OperationActivityTypeRecord, "slug" | "moneyKind">>,
): OperationMoney {
  let incoming = 0;
  let outgoing = 0;
  let quoted = 0;

  for (const entry of entries) {
    const amount = amountOf(entry);
    if (!amount) continue;

    const kind = moneyKind(entry.entryType, types);
    const stage = entry.documentStage ?? null;

    if (entry.entryType === "quotation" && stage !== "rejected" && stage !== "revised") {
      quoted += amount;
    }

    if (entry.entryType === "invoice" && stage !== "cancelled") {
      incoming += amount;
      continue;
    }

    if (kind === "out") {
      outgoing += amount;
    }
  }

  return { incoming, outgoing, quoted };
}

export function hasOperationMoney(money: OperationMoney) {
  return money.incoming > 0 || money.outgoing > 0 || money.quoted > 0;
}
