import { getDivisionName } from "@/lib/divisions";
import { formatBhd, formatDate } from "@/lib/utils";

import type { AccountingFilter } from "./filters";
import { filsToAmount, toFils } from "./money";
import {
  accountTotals,
  bankActivity,
  generalLedger,
  listCommercialForAccounting,
  listPayments,
  partyBalances,
  vatMovements,
} from "./queries";
import { buildBalanceSheet, profitAndLoss, trialBalanceSide } from "./statements";
import { extraReport } from "./report-pack";

export const reportCatalog = [
  { id: "profit-and-loss", title: "Profit & Loss" },
  { id: "balance-sheet", title: "Balance Sheet" },
  { id: "trial-balance", title: "Trial Balance" },
  { id: "general-ledger", title: "General Ledger" },
  { id: "cash-movement", title: "Cash movement" },
  { id: "cash-flow", title: "Cash flow" },
  { id: "customer-outstanding", title: "Customer outstanding" },
  { id: "supplier-outstanding", title: "Supplier outstanding" },
  { id: "ar-aging", title: "Accounts receivable aging" },
  { id: "ap-aging", title: "Accounts payable aging" },
  { id: "expenses", title: "Expenses" },
  { id: "vat-summary", title: "VAT report" },
  { id: "sales", title: "Sales" },
  { id: "purchases", title: "Purchases" },
  { id: "bank-reconciliation", title: "Bank reconciliation" },
  { id: "customer-statement", title: "Customer statement" },
  { id: "supplier-statement", title: "Supplier statement" },
  { id: "operation-profit", title: "Operation profitability" },
] as const;

export type ReportId = (typeof reportCatalog)[number]["id"];

export function isReportId(value: string): value is ReportId {
  return reportCatalog.some((report) => report.id === value);
}

export type ReportTable = {
  title: string;
  note: string;
  headers: string[];
  rows: string[][];
};

export async function buildReport(
  id: ReportId,
  filter: AccountingFilter,
): Promise<ReportTable> {
  const note = reportNote(filter);
  if (id === "profit-and-loss") return profitAndLossReport(filter, note);
  if (id === "balance-sheet") return balanceSheetReport(filter, note);
  if (id === "trial-balance") return trialBalanceReport(filter, note);
  if (id === "general-ledger") return ledgerReport(filter, note);
  if (id === "cash-movement") return cashReport(filter, note);
  if (id === "customer-outstanding") {
    return partyReport(filter, note, "receivable", "Customer outstanding");
  }
  if (id === "supplier-outstanding") {
    return partyReport(filter, note, "payable", "Supplier outstanding");
  }
  if (id === "expenses") return expenseReport(filter, note);
  if (id === "vat-summary") return vatReport(filter, note);
  if (id === "sales") return documentReport(filter, note, "invoice", "Sales");
  if (id === "purchases") return documentReport(filter, note, "procurement", "Purchases");
  return extraReport(id, filter, note);
}

function reportNote(filter: AccountingFilter) {
  const company =
    filter.companyId === "all"
      ? "Consolidated group in BHD. Each company's books are converted at the latest exchange rate saved on or before the end date. Balances owed between Zoom companies are removed. A company with no saved rate is left out."
      : getDivisionName(filter.companyId);
  return `${company} · ${filter.from} to ${filter.to} · posted journals only`;
}

async function profitAndLossReport(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const accounts = (await accountTotals(filter, "period")).filter(
    (row) => row.account_type === "income" || row.account_type === "expense",
  );
  const rows = accounts
    .filter((row) => row.debitFils !== 0n || row.creditFils !== 0n)
    .map((row) => {
      const amount =
        row.account_type === "income"
          ? row.creditFils - row.debitFils
          : row.debitFils - row.creditFils;
      return [
        companyCell(filter, row.company_id),
        row.code,
        row.name,
        row.account_type === "income"
          ? "Revenue"
          : row.subtype === "purchases"
            ? "Cost of sales"
            : "Operating expenses",
        money(amount),
      ].filter((cell) => cell !== null) as string[];
    });
  const totals = profitAndLoss(
    accounts.map((row) => ({
      accountType: row.account_type,
      debit: row.debitFils,
      credit: row.creditFils,
    })),
  );
  rows.push(["", "", "Net profit / loss", "", money(totals.profit)].filter((_, index) => filter.companyId === "all" || index !== 0));
  return {
    title: "Profit & Loss",
    note,
    headers: headers(filter, ["Account", "Name", "Category", "Amount"]),
    rows,
  };
}

async function balanceSheetReport(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const accounts = await accountTotals(filter, "asof");
  const statement = buildBalanceSheet(
    accounts.map((row) => ({
      accountType: row.account_type,
      debit: row.debitFils,
      credit: row.creditFils,
    })),
  );
  const rows = accounts
    .filter((row) => row.account_type !== "income" && row.account_type !== "expense")
    .filter((row) => row.debitFils !== row.creditFils)
    .map((row) => {
      const amount =
        row.normal_balance === "debit"
          ? row.debitFils - row.creditFils
          : row.creditFils - row.debitFils;
      return [
        companyCell(filter, row.company_id),
        row.code,
        row.name,
        labelType(row.account_type),
        money(amount),
      ].filter((cell) => cell !== null) as string[];
    });
  rows.push(totalRow(filter, "Current earnings not closed", statement.earnings));
  rows.push(totalRow(filter, "Assets", statement.assets));
  rows.push(totalRow(filter, "Liabilities + equity + earnings", statement.liabilities + statement.equityIncludingEarnings));
  return {
    title: "Balance Sheet",
    note: `${note}. Balances are as of ${filter.to}. Current earnings keep the statement in balance until the year is closed into retained earnings.`,
    headers: headers(filter, ["Account", "Name", "Category", "Balance"]),
    rows,
  };
}

async function trialBalanceReport(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const accounts = await accountTotals(filter, "asof");
  let debit = 0n;
  let credit = 0n;
  const rows = accounts
    .map((row) => {
      const side = trialBalanceSide(row.debitFils, row.creditFils);
      debit += side.debit;
      credit += side.credit;
      return { row, side };
    })
    .filter(({ side }) => side.debit !== 0n || side.credit !== 0n)
    .map(({ row, side }) =>
      [
        companyCell(filter, row.company_id),
        row.code,
        row.name,
        side.debit ? money(side.debit) : "",
        side.credit ? money(side.credit) : "",
      ].filter((cell) => cell !== null) as string[],
    );
  rows.push(
    [
      companyCell(filter, ""),
      "",
      "Totals",
      money(debit),
      money(credit),
    ].filter((cell) => cell !== null) as string[],
  );
  return {
    title: "Trial Balance",
    note: `${note}. As of ${filter.to}.`,
    headers: headers(filter, ["Account", "Name", "Debit", "Credit"]),
    rows,
  };
}

async function ledgerReport(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const ledger = await generalLedger(filter);
  const rows: string[][] = [];
  let current = "";
  let running = 0n;
  for (const line of ledger.lines) {
    if (line.account_id !== current) {
      current = line.account_id;
      running = ledger.openings.get(line.account_id) ?? 0n;
      rows.push(
        [
          companyCell(filter, line.company_id),
          line.code,
          line.name,
          filter.from,
          "Opening",
          "",
          money(running),
        ].filter((cell) => cell !== null) as string[],
      );
    }
    const debit = toFils(line.debit);
    const credit = toFils(line.credit);
    running += debit - credit;
    rows.push(
      [
        companyCell(filter, line.company_id),
        line.code,
        line.line_description || line.journal_description,
        line.entry_date,
        line.journal_number,
        money(debit - credit),
        money(running),
      ].filter((cell) => cell !== null) as string[],
    );
  }
  return {
    title: "General Ledger",
    note,
    headers: headers(filter, ["Account", "Description", "Date", "Journal", "Movement", "Balance"]),
    rows,
  };
}

async function cashReport(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const accounts = (await accountTotals(filter, "period")).filter(
    (row) => row.subtype === "cash" || row.subtype === "bank",
  );
  const activity = await bankActivity(filter);
  const rows = accounts.map((row) =>
    [
      companyCell(filter, row.company_id),
      row.code,
      row.name,
      money(row.debitFils),
      money(row.creditFils),
      money(row.debitFils - row.creditFils),
    ].filter((cell) => cell !== null) as string[],
  );
  for (const line of activity.slice(0, 100)) {
    rows.push(
      [
        companyCell(filter, line.company_id),
        line.code,
        `${line.entry_date} ${line.journal_number} ${line.description}`,
        money(toFils(line.debit)),
        money(toFils(line.credit)),
        "",
      ].filter((cell) => cell !== null) as string[],
    );
  }
  return {
    title: "Cash movement",
    note: `${note}. Posted movement in cash and bank accounts. This is not a classified cash flow statement.`,
    headers: headers(filter, ["Account", "Detail", "Debit", "Credit", "Net"]),
    rows,
  };
}

async function partyReport(
  filter: AccountingFilter,
  note: string,
  subtype: "receivable" | "payable",
  title: string,
): Promise<ReportTable> {
  const parties = await partyBalances(filter, subtype);
  return {
    title,
    note: `${note}. Outstanding as of ${filter.to}.`,
    headers: headers(filter, ["Name", "Outstanding"]),
    rows: parties.map((party) =>
      [companyCell(filter, party.company_id), party.name ?? "Unassigned", money(party.balanceFils)].filter(
        (cell) => cell !== null,
      ) as string[],
    ),
  };
}

async function expenseReport(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const accounts = (await accountTotals(filter, "period")).filter(
    (row) => row.account_type === "expense" && row.debitFils !== row.creditFils,
  );
  return {
    title: "Expenses",
    note,
    headers: headers(filter, ["Account", "Name", "Amount"]),
    rows: accounts.map((row) =>
      [
        companyCell(filter, row.company_id),
        row.code,
        row.name,
        money(row.debitFils - row.creditFils),
      ].filter((cell) => cell !== null) as string[],
    ),
  };
}

async function vatReport(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const rows = await vatMovements(filter);
  let output = 0n;
  let input = 0n;
  const table = rows.map((row) => {
    const amount =
      row.subtype === "vat_output"
        ? row.creditFils - row.debitFils
        : row.debitFils - row.creditFils;
    if (row.subtype === "vat_output") output += amount;
    else input += amount;
    return [
      companyCell(filter, row.company_id),
      row.code,
      row.name,
      row.subtype === "vat_output" ? "Output VAT" : "Input VAT",
      money(amount),
    ].filter((cell) => cell !== null) as string[];
  });
  table.push(totalRow(filter, "Output less input", output - input));
  return {
    title: "VAT summary",
    note: `${note}. Management summary of posted input and output VAT. This is not an NBR VAT return. Bahrain's standard rate is seeded at 10% and can be changed per company. Exempt and zero-rated supplies are not treated as standard rated.`,
    headers: headers(filter, ["Account", "Name", "Kind", "Amount"]),
    rows: table,
  };
}

async function documentReport(
  filter: AccountingFilter,
  note: string,
  entryType: "invoice" | "procurement",
  title: string,
): Promise<ReportTable> {
  const documents = await listCommercialForAccounting(entryType, filter);
  const payments = entryType === "invoice" ? await listPayments(filter) : [];
  const rows = documents.map((document) =>
    [
      companyCell(filter, document.operation?.divisionId ?? ""),
      document.operation?.operationCode ?? "",
      document.ledgerDate,
      entryType === "invoice"
        ? document.operation?.organization?.name || document.operation?.contact?.name || ""
        : document.vendorOrganization?.name || "",
      document.documentStage ?? "draft",
      formatBhd(document.amount) || "",
      document.journal && !document.journal.reversed ? document.journal.journalNumber : "Not posted",
      money(document.outstanding),
    ].filter((cell) => cell !== null) as string[],
  );
  if (entryType === "invoice") {
    for (const payment of payments.filter((payment) => payment.direction === "receipt")) {
      rows.push(
        [
          companyCell(filter, payment.companyId),
          payment.journal?.journalNumber ?? "",
          payment.paidOn,
          payment.organization?.name ?? "Receipt",
          "receipt",
          formatBhd(payment.amount) || "",
          payment.reference,
          "",
        ].filter((cell) => cell !== null) as string[],
      );
    }
  }
  return {
    title,
    note,
    headers: headers(filter, [
      "Reference",
      "Date",
      "Party",
      "Status",
      "Document amount",
      "Ledger",
      "Outstanding",
    ]),
    rows,
  };
}

function labelType(value: string) {
  if (value === "asset") return "Assets";
  if (value === "liability") return "Liabilities";
  if (value === "equity") return "Equity";
  if (value === "income") return "Income";
  if (value === "expense") return "Expenses";
  return value;
}

function headers(filter: AccountingFilter, rest: string[]) {
  return filter.companyId === "all" ? ["Company", ...rest] : rest;
}

function companyCell(filter: AccountingFilter, companyId: string) {
  if (filter.companyId !== "all") return null;
  return companyId ? getDivisionName(companyId) : "";
}

function totalRow(filter: AccountingFilter, label: string, amount: bigint) {
  const row = ["", "", label, "", money(amount)];
  return filter.companyId === "all" ? row : row.slice(1);
}

function money(fils: bigint) {
  return formatBhd(filsToAmount(fils));
}

export function formatReportDate(value: string) {
  return formatDate(value);
}
