import { sql } from "drizzle-orm";

import { db } from "@/db";
import { getDivisionName } from "@/lib/divisions";

import { ageBucket, classifyCashOffset } from "./documents";
import type { AccountingFilter } from "./filters";
import { filsToAmount, toFils } from "./money";
import { listCommercialForAccounting } from "./queries";
import type { ReportId, ReportTable } from "./reports";

export async function extraReport(
  id: ReportId,
  filter: AccountingFilter,
  note: string,
): Promise<ReportTable> {
  if (id === "cash-flow") return cashFlow(filter, note);
  if (id === "ar-aging") return aging(filter, note, "receivable");
  if (id === "ap-aging") return aging(filter, note, "payable");
  if (id === "bank-reconciliation") return reconciliations(filter, note);
  if (id === "customer-statement") return statement(filter, note, "receivable");
  if (id === "supplier-statement") return statement(filter, note, "payable");
  return operationProfit(filter, note);
}

async function cashFlow(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const company = filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const rows = await db.execute(sql`
    SELECT j.company_id,
           (l.debit - l.credit)::text AS net,
           offset_line.account_type,
           offset_line.subtype
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    LEFT JOIN LATERAL (
      SELECT oa.account_type, COALESCE(oa.subtype, '') AS subtype
      FROM accounting_journal_lines ol
      INNER JOIN accounting_accounts oa ON oa.id = ol.account_id
      WHERE ol.journal_id = j.id
        AND COALESCE(oa.subtype, '') NOT IN ('cash', 'bank')
      ORDER BY (ol.debit + ol.credit) DESC
      LIMIT 1
    ) offset_line ON true
    WHERE j.status = 'posted'
      AND j.reversed_by_id IS NULL
      AND j.entry_date >= ${filter.from}::date
      AND j.entry_date <= ${filter.to}::date
      AND a.subtype IN ('cash', 'bank')
      ${company}
  `);
  const buckets = new Map<string, bigint>();
  for (const row of rowsOf<{ net: string; account_type: string | null; subtype: string | null }>(rows)) {
    const kind = row.account_type
      ? classifyCashOffset(row.account_type, row.subtype)
      : "transfer";
    buckets.set(kind, (buckets.get(kind) ?? 0n) + toFils(row.net));
  }
  const order = ["operating", "investing", "financing", "transfer"];
  return {
    title: "Cash flow",
    note: `${note}. Direct method: each posted cash or bank line is classified from the largest non-cash line on the same journal. Transfers between cash and bank are shown separately and are not operating cash flow. This is not a full IAS 7 statement.`,
    headers: ["Section", "Net increase in cash"],
    rows: order.map((kind) => [label(kind), money(buckets.get(kind) ?? 0n)]),
  };
}

async function aging(
  filter: AccountingFilter,
  note: string,
  side: "receivable" | "payable",
): Promise<ReportTable> {
  const headers = ["Document", "Party", "Due", "Bucket", "Outstanding"];
  if (side === "receivable") {
    const invoices = await listCommercialForAccounting("invoice", { ...filter, from: "2000-01-01" });
    const rows = invoices
      .filter((row) => row.outstanding > 0n && row.ledgerDate <= filter.to)
      .map((row) => [
        row.operation?.operationCode ?? row.id,
        row.operation?.organization?.name || "No customer",
        row.ledgerDate,
        `${ageBucket(filter.to, row.ledgerDate)} (invoice date)`,
        money(row.outstanding),
      ]);
    return {
      title: "Accounts receivable aging",
      note: `${note}. Sales invoices have no due date, so the bucket uses the invoice date.`,
      headers,
      rows,
    };
  }

  const company = filter.companyId === "all" ? sql`` : sql`AND b.company_id = ${filter.companyId}`;
  const bills = await db.execute(sql`
    SELECT b.bill_number, b.due_date::text AS due_date, b.total::text AS total,
           COALESCE(o.name, '') AS supplier,
           COALESCE(pay.amount, 0)::text AS paid,
           COALESCE(credit.amount, 0)::text AS credited
    FROM accounting_bills b
    LEFT JOIN organizations o ON o.id = b.supplier_organization_id
    LEFT JOIN LATERAL (
      SELECT SUM(p.amount) AS amount
      FROM accounting_payments p
      INNER JOIN accounting_journals j ON j.id = p.journal_id
      WHERE p.bill_id = b.id AND j.status = 'posted' AND j.reversed_by_id IS NULL
    ) pay ON true
    LEFT JOIN LATERAL (
      SELECT SUM(c.total) AS amount
      FROM accounting_bills c
      WHERE c.credit_of_bill_id = b.id
        AND c.document_kind = 'credit_note'
        AND c.status IN ('posted', 'partial', 'paid')
    ) credit ON true
    WHERE b.document_kind = 'bill'
      AND b.status IN ('posted', 'partial')
      AND b.bill_date <= ${filter.to}::date
      ${company}
  `);
  const rows = rowsOf<{
    bill_number: string;
    due_date: string;
    total: string;
    supplier: string;
    paid: string;
    credited: string;
  }>(bills)
    .map((bill) => {
      const outstanding = toFils(bill.total) - toFils(bill.paid) - toFils(bill.credited);
      return { bill, outstanding };
    })
    .filter((row) => row.outstanding > 0n)
    .map((row) => [
      row.bill.bill_number,
      row.bill.supplier || "No supplier",
      row.bill.due_date,
      ageBucket(filter.to, row.bill.due_date),
      money(row.outstanding),
    ]);
  const procurement = await listCommercialForAccounting("procurement", { ...filter, from: "2000-01-01" });
  for (const row of procurement) {
    if (row.outstanding <= 0n || row.ledgerDate > filter.to) continue;
    rows.push([
      row.operation?.operationCode ?? row.id,
      row.vendorOrganization?.name || "No supplier",
      row.ledgerDate,
      `${ageBucket(filter.to, row.ledgerDate)} (document date)`,
      money(row.outstanding),
    ]);
  }
  return {
    title: "Accounts payable aging",
    note: `${note}. Supplier bills use the due date. Procurement documents use the document date because they have no due date.`,
    headers,
    rows,
  };
}

async function reconciliations(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const company = filter.companyId === "all" ? sql`` : sql`AND r.company_id = ${filter.companyId}`;
  const rows = await db.execute(sql`
    SELECT r.company_id, b.name AS bank, r.period_start::text AS period_start,
           r.period_end::text AS period_end, r.statement_balance::text AS statement_balance,
           r.ledger_balance::text AS ledger_balance, r.difference::text AS difference, r.status
    FROM accounting_reconciliations r
    INNER JOIN accounting_bank_accounts b ON b.id = r.bank_account_id
    WHERE r.period_end >= ${filter.from}::date
      AND r.period_start <= ${filter.to}::date
      ${company}
    ORDER BY r.period_end DESC
  `);
  return {
    title: "Bank reconciliation",
    note: `${note}. A completed reconciliation is locked in Zoom. This is not a live bank connection.`,
    headers: ["Company", "Bank", "Period", "Statement", "Ledger", "Difference", "Status"],
    rows: rowsOf<{
      company_id: string;
      bank: string;
      period_start: string;
      period_end: string;
      statement_balance: string;
      ledger_balance: string;
      difference: string;
      status: string;
    }>(rows).map((row) => [
      getDivisionName(row.company_id),
      row.bank,
      `${row.period_start} to ${row.period_end}`,
      row.statement_balance,
      row.ledger_balance,
      row.difference,
      row.status,
    ]),
  };
}

async function statement(
  filter: AccountingFilter,
  note: string,
  side: "receivable" | "payable",
): Promise<ReportTable> {
  if (!filter.organizationId) {
    return {
      title: side === "receivable" ? "Customer statement" : "Supplier statement",
      note: "Choose a customer or supplier, then apply the filter.",
      headers: ["Statement"],
      rows: [["No organization selected"]],
    };
  }
  const company = filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const rows = await db.execute(sql`
    SELECT j.entry_date::text AS entry_date, j.journal_number, j.description,
           a.code, a.name AS account_name, l.debit::text AS debit, l.credit::text AS credit
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted'
      AND j.reversed_by_id IS NULL
      AND l.organization_id = ${filter.organizationId}
      AND j.entry_date >= ${filter.from}::date
      AND j.entry_date <= ${filter.to}::date
      AND a.subtype = ${side}
      ${company}
    ORDER BY j.entry_date, j.journal_number
  `);
  let running = 0n;
  const table = rowsOf<{
    entry_date: string;
    journal_number: string;
    description: string;
    code: string;
    account_name: string;
    debit: string;
    credit: string;
  }>(rows).map((row) => {
    const movement = side === "receivable" ? toFils(row.debit) - toFils(row.credit) : toFils(row.credit) - toFils(row.debit);
    running += movement;
    return [row.entry_date, row.journal_number, row.description, `${row.code} ${row.account_name}`, money(movement), money(running)];
  });
  return {
    title: side === "receivable" ? "Customer statement" : "Supplier statement",
    note,
    headers: ["Date", "Journal", "Description", "Account", "Movement", "Balance"],
    rows: table,
  };
}

async function operationProfit(filter: AccountingFilter, note: string): Promise<ReportTable> {
  const company = filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const rows = await db.execute(sql`
    SELECT j.company_id, op.operation_code, op.title,
           COALESCE(SUM(CASE WHEN a.account_type = 'income' THEN l.credit - l.debit ELSE 0 END), 0)::text AS income,
           COALESCE(SUM(CASE WHEN a.account_type = 'expense' THEN l.debit - l.credit ELSE 0 END), 0)::text AS expense
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    INNER JOIN operations op ON op.id = j.operation_id
    WHERE j.status = 'posted'
      AND j.reversed_by_id IS NULL
      AND j.entry_date >= ${filter.from}::date
      AND j.entry_date <= ${filter.to}::date
      AND a.account_type IN ('income', 'expense')
      ${company}
    GROUP BY j.company_id, op.operation_code, op.title
    ORDER BY op.operation_code
  `);
  return {
    title: "Operation profitability",
    note: `${note}. Income and expense posted to an operation. This is not a consolidated group result.`,
    headers: ["Company", "Operation", "Income", "Expense", "Profit"],
    rows: rowsOf<{
      company_id: string;
      operation_code: string;
      title: string;
      income: string;
      expense: string;
    }>(rows).map((row) => {
      const income = toFils(row.income);
      const expense = toFils(row.expense);
      return [
        getDivisionName(row.company_id),
        `${row.operation_code} ${row.title}`.trim(),
        money(income),
        money(expense),
        money(income - expense),
      ];
    }),
  };
}

function money(fils: bigint) {
  return filsToAmount(fils);
}

function label(kind: string) {
  if (kind === "operating") return "Operating";
  if (kind === "investing") return "Investing";
  if (kind === "financing") return "Financing";
  return "Transfers between cash and bank";
}

function rowsOf<T = any>(rows: unknown): T[] {
  if (Array.isArray(rows)) return rows as T[];
  if (rows && typeof rows === "object" && "rows" in rows) {
    const nested = (rows as { rows?: unknown }).rows;
    return Array.isArray(nested) ? (nested as T[]) : [];
  }
  return [];
}
