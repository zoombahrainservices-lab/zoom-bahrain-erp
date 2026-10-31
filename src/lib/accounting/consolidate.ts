import { convertToBhd } from "./documents";
import { filsToAmount } from "./money";

export function amountInBhd(amount: bigint, currency: string, rateToBhd: string | null) {
  if (currency === "BHD") return amount;
  if (!rateToBhd) return null;
  return convertToBhd(amount, rateToBhd);
}

type IntercompanyRow = {
  subtype: string | null;
  debitFils: bigint;
  creditFils: bigint;
  debit: string;
  credit: string;
  name: string;
};

export function eliminateIntercompany<T extends IntercompanyRow>(rows: T[]): T[] {
  let dueFrom = 0n;
  let dueTo = 0n;
  const kept: T[] = [];
  let fromSample: T | null = null;
  let toSample: T | null = null;
  for (const row of rows) {
    if (row.subtype === "due_from") {
      dueFrom += row.debitFils - row.creditFils;
      fromSample = row;
      continue;
    }
    if (row.subtype === "due_to") {
      dueTo += row.creditFils - row.debitFils;
      toSample = row;
      continue;
    }
    kept.push(row);
  }
  const residual = dueFrom - dueTo;
  if (residual > 0n && fromSample) {
    kept.push({
      ...fromSample,
      name: "Intercompany difference",
      debitFils: residual,
      creditFils: 0n,
      debit: filsToAmount(residual),
      credit: "0.000",
    });
  } else if (residual < 0n && toSample) {
    kept.push({
      ...toSample,
      name: "Intercompany difference",
      debitFils: 0n,
      creditFils: -residual,
      debit: "0.000",
      credit: filsToAmount(-residual),
    });
  }
  return kept;
}
