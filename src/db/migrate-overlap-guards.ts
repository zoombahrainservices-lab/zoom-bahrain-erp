import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

/**
 * Additive overlap guards. Does not update, reverse, or delete journals.
 * If confirmed duplicates already share an operation entry, the unique index
 * is refused and the whole transaction rolls back.
 *
 * Deployment order:
 * 1. Back up the database, including accounting_journals and accounting_expenses.
 * 2. Deploy the application first. Before this migration, saving an expense
 *    with a cost note is refused with an explicit message. Unlinked expenses
 *    still save. Supplier invoices already record against an open receipt
 *    without this migration.
 * 3. Run npm run db:migrate-overlap-guards against the intended database.
 * 4. Confirm accounting_expenses.operation_entry_id exists and the two journal
 *    indexes exist. Re-running this script is safe.
 *
 * Recovery: a failed run leaves the database as it was. This script cannot
 * undo a successful run by itself. Restoring the backup is the recovery if
 * the new indexes must be removed. Do not delete journals to make it pass.
 *
 * Not applied to live books by the overlap fix. Run deliberately:
 * npm run db:migrate-overlap-guards
 */
export async function applyOverlapGuards(sql: postgres.Sql) {
  await sql.begin(async (tx) => {
    await tx`SET statement_timeout = '120s'`;
    await tx`
      ALTER TABLE accounting_expenses
      ADD COLUMN IF NOT EXISTS operation_entry_id text
    `;
    await tx`
      CREATE UNIQUE INDEX IF NOT EXISTS accounting_expenses_cost_entry_idx
      ON accounting_expenses (operation_entry_id)
      WHERE operation_entry_id IS NOT NULL AND status <> 'reversed'
    `;
    await tx`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM accounting_journals
          WHERE status = 'posted'
            AND reversed_by_id IS NULL
            AND reversal_of_id IS NULL
            AND operation_entry_id IS NOT NULL
            AND source_type IN ('procurement', 'supplier_bill')
          GROUP BY company_id, operation_entry_id
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Confirmed purchase journals already share an operation entry. The unique index was not created. Review them on Control. No rows were changed.';
        END IF;
        IF EXISTS (
          SELECT 1
          FROM accounting_journals
          WHERE status = 'posted'
            AND reversed_by_id IS NULL
            AND reversal_of_id IS NULL
            AND operation_entry_id IS NOT NULL
            AND source_type IN ('operation_cost', 'expense')
          GROUP BY company_id, operation_entry_id
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Confirmed cost journals already share an operation entry. The unique index was not created. Review them on Control. No rows were changed.';
        END IF;
      END $$
    `;
    await tx`
      CREATE UNIQUE INDEX IF NOT EXISTS accounting_journals_purchase_entry_once
      ON accounting_journals (company_id, operation_entry_id)
      WHERE status = 'posted'
        AND reversed_by_id IS NULL
        AND reversal_of_id IS NULL
        AND operation_entry_id IS NOT NULL
        AND source_type IN ('procurement', 'supplier_bill')
    `;
    await tx`
      CREATE UNIQUE INDEX IF NOT EXISTS accounting_journals_cost_entry_once
      ON accounting_journals (company_id, operation_entry_id)
      WHERE status = 'posted'
        AND reversed_by_id IS NULL
        AND reversal_of_id IS NULL
        AND operation_entry_id IS NOT NULL
        AND source_type IN ('operation_cost', 'expense')
    `;
  });
}

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const sql = postgres(url, {
    prepare: false,
    ssl: host === "localhost" || host === "127.0.0.1" ? false : "require",
    max: 1,
    connect_timeout: 20,
  });
  await applyOverlapGuards(sql);
  await sql.end({ timeout: 5 });
}

const entry = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (entry.endsWith("migrate-overlap-guards.ts")) {
  migrate().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
