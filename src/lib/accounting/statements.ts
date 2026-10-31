export type AccountMovement = {
  accountType: string;
  debit: bigint;
  credit: bigint;
};

export function trialBalanceSide(debit: bigint, credit: bigint) {
  const net = debit - credit;
  if (net >= 0n) return { debit: net, credit: 0n };
  return { debit: 0n, credit: -net };
}

export function buildBalanceSheet(rows: AccountMovement[]) {
  let assets = 0n;
  let liabilities = 0n;
  let equity = 0n;
  let income = 0n;
  let expense = 0n;

  for (const row of rows) {
    if (row.accountType === "asset") assets += row.debit - row.credit;
    if (row.accountType === "liability") liabilities += row.credit - row.debit;
    if (row.accountType === "equity") equity += row.credit - row.debit;
    if (row.accountType === "income") income += row.credit - row.debit;
    if (row.accountType === "expense") expense += row.debit - row.credit;
  }

  const earnings = income - expense;
  const equityIncludingEarnings = equity + earnings;
  return {
    assets,
    liabilities,
    equity,
    income,
    expense,
    earnings,
    equityIncludingEarnings,
    balanced: assets === liabilities + equityIncludingEarnings,
  };
}

export function profitAndLoss(rows: AccountMovement[]) {
  let income = 0n;
  let expense = 0n;
  for (const row of rows) {
    if (row.accountType === "income") income += row.credit - row.debit;
    if (row.accountType === "expense") expense += row.debit - row.credit;
  }
  return { income, expense, profit: income - expense };
}
