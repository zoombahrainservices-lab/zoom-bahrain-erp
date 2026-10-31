import { priceBillLine, type VatRule } from "./documents";
import { filsToAmount, toFils } from "./money";

const salesTreatments = new Set(["standard", "zero", "exempt", "out_of_scope"]);

export type SalesLineInput = {
  description: string;
  quantity: string;
  unitAmount: string;
  discount: string;
  vat: VatRule | null;
};

export function priceSalesLine(line: SalesLineInput) {
  if (line.vat && !salesTreatments.has(line.vat.treatment)) {
    throw new Error("Sales invoices use standard, zero-rated, exempt, or out-of-scope VAT");
  }
  const priced = priceBillLine({
    description: line.description,
    quantity: line.quantity,
    unitAmount: line.unitAmount,
    discount: line.discount,
    expenseAccountId: "sales",
    vat: line.vat,
  });
  return {
    net: priced.net,
    vat: line.vat?.treatment === "standard" ? priced.vat : 0n,
    total: priced.net + (line.vat?.treatment === "standard" ? priced.vat : 0n),
  };
}

export function defaultReminderOffsets() {
  return [-3, 0, 7, 14, 30];
}

export function reminderKey(daysFromDue: number) {
  if (daysFromDue < 0) return `before-${Math.abs(daysFromDue)}`;
  if (daysFromDue === 0) return "due";
  return `over-${daysFromDue}`;
}

export function matchingReminder(daysFromDue: number, offsets: number[]) {
  return offsets.includes(daysFromDue) ? reminderKey(daysFromDue) : null;
}

export function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

export function movingAverage(onHand: bigint, average: bigint, received: bigint, cost: bigint) {
  if (received <= 0n) throw new Error("Received quantity must be greater than zero");
  const nextQty = onHand + received;
  const value = (onHand * average + received * cost) / 1000n;
  return { quantity: nextQty, average: (value * 1000n) / nextQty };
}

export function issueCost(quantity: bigint, average: bigint) {
  return quantity * average / 1000n;
}

export function stockPostsJournal(ownership: string, kind: string) {
  if (ownership !== "company") return false;
  return kind === "receipt" || kind === "sale" || kind === "issue";
}

export function procurementConflict(input: {
  hasPostedProcurement: boolean;
  hasActiveBill: boolean;
}) {
  return input.hasPostedProcurement && input.hasActiveBill;
}

export function canApproveOwn(actorId: string, creatorId: string, blockSelf: boolean) {
  if (!blockSelf) return true;
  return actorId !== creatorId;
}

export function profitMargin(profit: bigint, revenue: bigint) {
  if (revenue === 0n) return null;
  return Number((profit * 10000n) / revenue) / 100;
}

export function payrollBreakdown(input: {
  gross: string;
  deductions: string;
  statutory: string;
  netPay: string;
}) {
  const gross = toFils(input.gross);
  const deductions = toFils(input.deductions);
  const statutory = toFils(input.statutory);
  const net = toFils(input.netPay);
  if (gross !== net + deductions + statutory) {
    throw new Error("Gross pay must equal net pay, deductions, and statutory amounts");
  }
  return { gross, deductions, statutory, net };
}

export function intercompanySides(kind: "expense" | "loan" | "settlement") {
  if (kind === "settlement") {
    return { fromDebit: "bank", fromCredit: "due_from", toDebit: "due_to", toCredit: "bank" };
  }
  if (kind === "loan") {
    return { fromDebit: "due_from", fromCredit: "bank", toDebit: "bank", toCredit: "due_to" };
  }
  return { fromDebit: "due_from", fromCredit: "bank", toDebit: "expense", toCredit: "due_to" };
}

export function moneyText(fils: bigint) {
  return filsToAmount(fils);
}
