import { sql } from "drizzle-orm";

import { db } from "@/db";

import { columnExists } from "./schema-ready";

export type OverlapFinding = {
  kind: "confirmed" | "suspected";
  companyId: string;
  detail: string;
};

function rowsOf<T>(rows: unknown): T[] {
  if (Array.isArray(rows)) return rows as T[];
  if (rows && typeof rows === "object" && "rows" in rows) {
    const nested = (rows as { rows?: unknown }).rows;
    return Array.isArray(nested) ? (nested as T[]) : [];
  }
  return [];
}

type JournalPair = {
  company_id: string;
  detail: string;
};

/**
 * Read-only. Does not reverse, merge, or repost anything.
 * Confirmed rows have an explicit shared source. Suspected rows share an
 * operation and a supplier and still need a person to decide.
 */
export async function diagnoseHistoricalOverlaps(companyId: string) {
  const company =
    companyId === "all" ? sql`` : sql`AND company_id = ${companyId}`;
  const purchase = await db.execute(sql`
    SELECT company_id, detail FROM (
      SELECT j.company_id,
             'Procurement ' || j.journal_number || ' and supplier bill ' || b.bill_number || ' both posted for procurement ' || b.procurement_entry_id AS detail
      FROM accounting_journals j
      INNER JOIN accounting_bills b
        ON b.company_id = j.company_id
       AND b.procurement_entry_id = j.source_id
      INNER JOIN accounting_journals bill_journal ON bill_journal.id = b.journal_id
      WHERE j.source_type = 'procurement'
        AND j.status = 'posted'
        AND j.reversed_by_id IS NULL
        AND j.reversal_of_id IS NULL
        AND b.status <> 'reversed'
        AND bill_journal.source_type = 'supplier_bill'
        AND bill_journal.status = 'posted'
        AND bill_journal.reversed_by_id IS NULL
        AND bill_journal.reversal_of_id IS NULL
      UNION ALL
      SELECT company_id,
             'Journals ' || string_agg(journal_number, ', ' ORDER BY journal_number)
               || ' (' || string_agg(DISTINCT source_type, ', ') || ') share operation entry ' || operation_entry_id AS detail
      FROM accounting_journals
      WHERE status = 'posted'
        AND reversed_by_id IS NULL
        AND reversal_of_id IS NULL
        AND operation_entry_id IS NOT NULL
        AND source_type IN ('procurement', 'supplier_bill')
      GROUP BY company_id, operation_entry_id
      HAVING COUNT(DISTINCT source_type) > 1
    ) confirmed
    WHERE 1 = 1 ${company}
    LIMIT 50
  `);
  const costs = await db.execute(sql`
    SELECT company_id,
           'Journals ' || string_agg(journal_number, ', ' ORDER BY journal_number)
             || ' share cost entry ' || operation_entry_id AS detail
    FROM accounting_journals
    WHERE status = 'posted'
      AND reversed_by_id IS NULL
      AND reversal_of_id IS NULL
      AND operation_entry_id IS NOT NULL
      AND source_type IN ('operation_cost', 'expense')
      ${company}
    GROUP BY company_id, operation_entry_id
    HAVING COUNT(DISTINCT source_type) > 1
    LIMIT 50
  `);
  const suspected = await db.execute(sql`
    SELECT p.company_id,
           'Operation ' || COALESCE(p.operation_id, '') || ' has posted procurement ' || p.journal_number
             || ' and supplier bill ' || b.bill_number
             || ' for the same supplier, with no procurement link. Review it. This is not proof they are the same purchase.' AS detail
    FROM accounting_journals p
    INNER JOIN accounting_bills b
      ON b.company_id = p.company_id
     AND b.operation_id = p.operation_id
     AND b.supplier_organization_id = p.organization_id
    WHERE p.source_type = 'procurement'
      AND p.status = 'posted'
      AND p.reversed_by_id IS NULL
      AND p.reversal_of_id IS NULL
      AND p.operation_id IS NOT NULL
      AND p.organization_id IS NOT NULL
      AND b.procurement_entry_id IS NULL
      AND b.status IN ('posted', 'partial', 'paid')
      AND b.document_kind = 'bill'
      ${companyId === "all" ? sql`` : sql`AND p.company_id = ${companyId}`}
    LIMIT 50
  `);

  const confirmed: OverlapFinding[] = [
    ...rowsOf<JournalPair>(purchase).map((row) => ({
      kind: "confirmed" as const,
      companyId: row.company_id,
      detail: row.detail,
    })),
    ...rowsOf<JournalPair>(costs).map((row) => ({
      kind: "confirmed" as const,
      companyId: row.company_id,
      detail: row.detail,
    })),
  ];
  return {
    confirmed,
    suspected: rowsOf<JournalPair>(suspected).map((row) => ({
      kind: "suspected" as const,
      companyId: row.company_id,
      detail: row.detail,
    })),
    note: "Confirmed rows share an explicit procurement link or the same operation entry on two open journals. Suspected rows only share an operation and a supplier. Separate bills, partial payments, and credit notes are not listed. Nothing here is reversed or merged.",
  };
}

export type CostExpenseLink = {
  expenseId: string;
  expenseNumber: string;
  entryId: string;
  operationCode: string;
};

export async function loadCostExpenseLinks(): Promise<CostExpenseLink[]> {
  const ready = await columnExists(db, "accounting_expenses", "operation_entry_id");
  if (!ready) return [];
  const rows = await db.execute(sql`
    SELECT e.id AS expense_id,
           e.expense_number,
           e.operation_entry_id AS entry_id,
           COALESCE(o.operation_code, '') AS operation_code
    FROM accounting_expenses e
    LEFT JOIN operation_entries en ON en.id = e.operation_entry_id
    LEFT JOIN operations o ON o.id = en.operation_id
    WHERE e.operation_entry_id IS NOT NULL
      AND e.status <> 'reversed'
  `);
  return rowsOf<{
    expense_id: string;
    expense_number: string;
    entry_id: string;
    operation_code: string;
  }>(rows).map((row) => ({
    expenseId: row.expense_id,
    expenseNumber: row.expense_number,
    entryId: row.entry_id,
    operationCode: row.operation_code,
  }));
}
