export type HomeMonth = {
  month: string;
  sales: bigint;
  purchases: bigint;
  moneyIn: bigint;
  moneyOut: bigint;
};

/** Calendar months touched by the selected period. A long range keeps the latest months. */
export function monthsBetween(from: string, to: string, limit = 36) {
  const start = /^(\d{4})-(\d{2})/.exec(from);
  const end = /^(\d{4})-(\d{2})/.exec(to);
  if (!start || !end) return { months: [] as string[], truncated: false };
  let year = Number(start[1]);
  let month = Number(start[2]);
  const endIndex = Number(end[1]) * 12 + Number(end[2]);
  const keys: string[] = [];
  let guard = 0;
  while (year * 12 + month <= endIndex && guard < 240) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
    guard += 1;
  }
  if (keys.length <= limit) return { months: keys, truncated: false };
  return { months: keys.slice(-limit), truncated: true };
}

export function blankHomeMonths(months: string[]): HomeMonth[] {
  return months.map((month) => ({
    month,
    sales: 0n,
    purchases: 0n,
    moneyIn: 0n,
    moneyOut: 0n,
  }));
}

export function addHomeAmount(
  months: HomeMonth[],
  month: string,
  field: "sales" | "purchases" | "moneyIn" | "moneyOut",
  amount: bigint | null,
) {
  if (amount === null) return;
  const row = months.find((entry) => entry.month === month);
  if (!row) return;
  row[field] += amount;
}
