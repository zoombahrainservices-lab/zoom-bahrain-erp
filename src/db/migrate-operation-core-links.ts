import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOperationCoreLinks() {
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
    ALTER TABLE "sales_inquiries"
    ADD COLUMN IF NOT EXISTS "converted_operation_id" text
  `;

  await sql`
    ALTER TABLE "tasks"
    ADD COLUMN IF NOT EXISTS "operation_id" text
  `;

  await sql`
    ALTER TABLE "tasks"
    ADD COLUMN IF NOT EXISTS "operation_entry_id" text
  `;

  await sql.end();
  console.log("Operation core links are present.");
}

migrateOperationCoreLinks().catch((error) => {
  console.error(error);
  process.exit(1);
});
