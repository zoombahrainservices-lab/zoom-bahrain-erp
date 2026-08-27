import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOperationEntryAmount() {
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
    ADD COLUMN IF NOT EXISTS "amount" numeric(12, 3)
  `;

  await sql.end();
  console.log("Operation entry amount migration complete.");
}

migrateOperationEntryAmount().catch((error) => {
  console.error(error);
  process.exit(1);
});
