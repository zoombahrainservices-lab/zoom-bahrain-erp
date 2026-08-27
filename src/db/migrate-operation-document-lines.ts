import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOperationDocumentLines() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, {
    prepare: false,
    ssl: "require",
    max: 1,
    connect_timeout: 20,
  });

  await sql`SET statement_timeout = '120s'`;

  await sql`
    CREATE TABLE IF NOT EXISTS "operation_document_lines" (
      "id" text PRIMARY KEY,
      "entry_id" text NOT NULL REFERENCES "operation_entries"("id") ON DELETE CASCADE,
      "description" text NOT NULL DEFAULT '',
      "quantity" numeric(12, 3) NOT NULL,
      "unit_amount" numeric(12, 3) NOT NULL,
      "sort_order" integer NOT NULL DEFAULT 0,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "operation_document_lines_entry_id_idx"
    ON "operation_document_lines" ("entry_id")
  `;

  await sql`
    UPDATE "operation_activity_types"
    SET "money_kind" = 'in'
    WHERE "slug" = 'proposal' AND "money_kind" = 'none'
  `;

  const [{ exists }] = await sql`
    SELECT to_regclass('public.operation_document_lines') IS NOT NULL AS exists
  `;

  await sql.end();
  console.log(
    exists
      ? "Operation document lines table is present."
      : "WARNING: table still missing after CREATE.",
  );
}

migrateOperationDocumentLines().catch((error) => {
  console.error(error);
  process.exit(1);
});
