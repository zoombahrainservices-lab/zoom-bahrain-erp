import { sql, type SQL } from "drizzle-orm";

type Executor = {
  execute: (query: SQL) => Promise<unknown>;
};

function rowsOf(rows: unknown) {
  if (Array.isArray(rows)) return rows as Array<Record<string, unknown>>;
  if (rows && typeof rows === "object" && "rows" in rows) {
    const nested = (rows as { rows?: unknown }).rows;
    return Array.isArray(nested) ? (nested as Array<Record<string, unknown>>) : [];
  }
  return [];
}

export async function columnExists(executor: Executor, table: string, column: string) {
  const rows = await executor.execute(sql`
    SELECT 1 AS ok
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
  `);
  return rowsOf(rows).length > 0;
}
