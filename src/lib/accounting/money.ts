const FILS = 1000n;

export class AccountingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountingError";
  }
}

export function toFils(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new AccountingError("Invalid amount");
    }
    return toFils(value.toFixed(3));
  }

  const trimmed = value.trim();
  if (!trimmed) throw new AccountingError("Amount is required");

  const negative = trimmed.startsWith("-");
  const raw = negative ? trimmed.slice(1) : trimmed;
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new AccountingError("Invalid amount");
  }

  const [whole, fraction = ""] = raw.split(".");
  const padded = `${fraction}000`;
  let fils = BigInt(whole) * FILS + BigInt(padded.slice(0, 3));
  if (fraction.length > 3 && fraction[3] >= "5") {
    fils += 1n;
  }
  return negative ? -fils : fils;
}

export function filsToAmount(fils: bigint): string {
  const negative = fils < 0n;
  const absolute = negative ? -fils : fils;
  const whole = absolute / FILS;
  const fraction = (absolute % FILS).toString().padStart(3, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export type JournalSide = {
  debit: bigint;
  credit: bigint;
};

export function lineSide(debitRaw: string, creditRaw: string): JournalSide {
  const debit = toFils(debitRaw || "0");
  const credit = toFils(creditRaw || "0");
  if (debit < 0n || credit < 0n) {
    throw new AccountingError("Amounts cannot be negative");
  }
  if (debit > 0n && credit > 0n) {
    throw new AccountingError("A line cannot have both a debit and a credit");
  }
  if (debit === 0n && credit === 0n) {
    throw new AccountingError("Each line needs a debit or a credit");
  }
  return { debit, credit };
}

export function assertBalanced(lines: JournalSide[]) {
  if (lines.length < 2) {
    throw new AccountingError("A journal needs at least two lines");
  }

  let debit = 0n;
  let credit = 0n;
  for (const line of lines) {
    debit += line.debit;
    credit += line.credit;
  }

  if (debit === 0n) {
    throw new AccountingError("Journal has no amount");
  }
  if (debit !== credit) {
    throw new AccountingError(
      `Journal is out of balance. Debits ${filsToAmount(debit)} and credits ${filsToAmount(credit)} must match.`,
    );
  }
}

export function splitInclusiveVat(gross: bigint, ratePercent: string) {
  const rateMillis = toFils(ratePercent);
  if (rateMillis < 0n) throw new AccountingError("VAT rate cannot be negative");
  if (rateMillis === 0n || gross <= 0n) return { net: gross, vat: 0n };
  const net = (gross * 100000n) / (100000n + rateMillis);
  return { net, vat: gross - net };
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
