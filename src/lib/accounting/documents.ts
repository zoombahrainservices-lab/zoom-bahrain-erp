import type { VatTreatment } from "@/db/schema";

import { AccountingError, filsToAmount, toFils } from "./money";

export type VatRule = {
  id: string;
  rate: string;
  treatment: VatTreatment;
};

export type PricedLine = {
  description: string;
  quantity: bigint;
  unitAmount: bigint;
  discount: bigint;
  net: bigint;
  vat: bigint;
  recoverableVat: bigint;
  nonRecoverableVat: bigint;
  outputVat: bigint;
  supplierTotal: bigint;
  expenseAccountId: string;
  vatCodeId: string | null;
};

const charged = new Set<VatTreatment>(["standard", "non_recoverable"]);

export function multiplyQty(quantity: bigint, unitAmount: bigint) {
  return (quantity * unitAmount) / 1000n;
}

export function vatOnNet(net: bigint, ratePercent: string) {
  const rate = toFils(ratePercent);
  if (rate < 0n) throw new AccountingError("VAT rate cannot be negative");
  if (rate === 0n || net <= 0n) return 0n;
  return (net * rate) / 100000n;
}

export function convertToBhd(amount: bigint, rateToBhd: string) {
  const rate = toFils(rateToBhd);
  if (rate <= 0n) throw new AccountingError("Enter an exchange rate greater than zero");
  return (amount * rate) / 1000n;
}

export function priceBillLine(input: {
  description: string;
  quantity: string;
  unitAmount: string;
  discount: string;
  expenseAccountId: string;
  vat: VatRule | null;
}) {
  const quantity = toFils(input.quantity || "0");
  const unitAmount = toFils(input.unitAmount || "0");
  const discount = toFils(input.discount || "0");
  if (quantity <= 0n) throw new AccountingError("Quantity must be greater than zero");
  if (unitAmount < 0n || discount < 0n) {
    throw new AccountingError("Prices and discounts cannot be negative");
  }
  const gross = multiplyQty(quantity, unitAmount);
  if (discount > gross) throw new AccountingError("Discount cannot exceed the line amount");
  const net = gross - discount;
  const treatment = input.vat?.treatment ?? "out_of_scope";
  const rate = input.vat?.rate ?? "0";
  const calculated =
    treatment === "zero" || treatment === "exempt" || treatment === "out_of_scope"
      ? 0n
      : vatOnNet(net, rate);
  const supplierChargesVat = charged.has(treatment);
  const recoverable = treatment === "standard" || treatment === "reverse_charge" || treatment === "import";
  return {
    description: input.description.trim(),
    quantity,
    unitAmount,
    discount,
    net,
    vat: calculated,
    recoverableVat: recoverable ? calculated : 0n,
    nonRecoverableVat: treatment === "non_recoverable" ? calculated : 0n,
    outputVat: treatment === "reverse_charge" || treatment === "import" ? calculated : 0n,
    supplierTotal: net + (supplierChargesVat ? calculated : 0n),
    expenseAccountId: input.expenseAccountId,
    vatCodeId: input.vat?.id ?? null,
  } satisfies PricedLine;
}

export function sumPriced(lines: PricedLine[]) {
  return lines.reduce(
    (total, line) => ({
      net: total.net + line.net,
      discount: total.discount + line.discount,
      vat: total.vat + line.vat,
      recoverableVat: total.recoverableVat + line.recoverableVat,
      nonRecoverableVat: total.nonRecoverableVat + line.nonRecoverableVat,
      outputVat: total.outputVat + line.outputVat,
      supplierTotal: total.supplierTotal + line.supplierTotal,
    }),
    {
      net: 0n,
      discount: 0n,
      vat: 0n,
      recoverableVat: 0n,
      nonRecoverableVat: 0n,
      outputVat: 0n,
      supplierTotal: 0n,
    },
  );
}

export function ageBucket(asOf: string, dueOn: string) {
  const asOfDate = Date.parse(`${asOf}T00:00:00Z`);
  const dueDate = Date.parse(`${dueOn}T00:00:00Z`);
  const days = Math.floor((asOfDate - dueDate) / 86400000);
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return "Over 90";
}

export function classifyCashOffset(accountType: string, subtype: string | null) {
  if (subtype === "cash" || subtype === "bank") return "transfer";
  if (subtype === "fixed_asset" || subtype === "inventory") return "investing";
  if (subtype === "loan" || subtype === "capital" || accountType === "equity") return "financing";
  return "operating";
}

export function statementFingerprint(input: {
  date: string;
  amount: string;
  reference: string;
  description: string;
}) {
  return [
    input.date,
    filsToAmount(toFils(input.amount)),
    input.reference.trim().toLowerCase(),
    input.description.trim().toLowerCase(),
  ].join("|");
}

export function maskAccount(value: string) {
  const trimmed = value.replace(/\s/g, "");
  if (trimmed.length <= 4) return trimmed;
  return `•••• ${trimmed.slice(-4)}`;
}

export function vatDueDate(periodEnd: string) {
  const [yearText, monthText] = periodEnd.split("-");
  let year = Number(yearText);
  let month = Number(monthText) + 1;
  if (month === 13) {
    month = 1;
    year += 1;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function parseStatementCsv(text: string) {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) throw new AccountingError("The statement needs a header and at least one line");
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const dateIndex = header.findIndex((cell) => cell === "date");
  const amountIndex = header.findIndex((cell) => cell === "amount");
  const debitIndex = header.findIndex((cell) => cell === "debit");
  const creditIndex = header.findIndex((cell) => cell === "credit");
  const descriptionIndex = header.findIndex((cell) => cell.includes("description") || cell === "details");
  const referenceIndex = header.findIndex((cell) => cell === "reference" || cell === "ref");
  if (dateIndex < 0) throw new AccountingError("The statement needs a date column");
  if (amountIndex < 0 && (debitIndex < 0 || creditIndex < 0)) {
    throw new AccountingError("The statement needs an amount column, or debit and credit columns");
  }

  return rows.slice(1).map((row) => {
    const date = normalizeDate(row[dateIndex] ?? "");
    let amount = "0";
    if (amountIndex >= 0) amount = row[amountIndex] ?? "0";
    else {
      const debit = toFils(row[debitIndex] || "0");
      const credit = toFils(row[creditIndex] || "0");
      amount = filsToAmount(debit - credit);
    }
    return {
      date,
      amount,
      description: descriptionIndex >= 0 ? row[descriptionIndex] ?? "" : "",
      reference: referenceIndex >= 0 ? row[referenceIndex] ?? "" : "",
    };
  });
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[/.]/);
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  throw new AccountingError(`Unrecognised statement date: ${value}`);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}
