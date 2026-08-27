import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOperationEntryDocumentStage() {
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
    ALTER TABLE "operation_entries"
    ADD COLUMN IF NOT EXISTS "document_stage" text
  `;

  await sql`
    ALTER TABLE "operation_entries"
    ADD COLUMN IF NOT EXISTS "parent_entry_id" text
  `;

  await sql`
    UPDATE "operation_entries"
    SET "document_stage" = 'draft'
    WHERE "entry_type" IN ('quotation', 'invoice', 'proposal')
      AND "document_stage" IS NULL
  `;

  await sql.end();
  console.log("Operation entry document stage migration complete.");
}

migrateOperationEntryDocumentStage().catch((error) => {
  console.error(error);
  process.exit(1);
});
