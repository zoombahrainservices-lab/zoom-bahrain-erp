import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOperationEntryVendor() {
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
    ADD COLUMN IF NOT EXISTS "vendor_organization_id" text
  `;

  await sql`
    ALTER TABLE "operation_entries"
    ADD COLUMN IF NOT EXISTS "vendor_contact_id" text
  `;

  await sql.end();
  console.log("Operation entry vendor columns are present.");
}

migrateOperationEntryVendor().catch((error) => {
  console.error(error);
  process.exit(1);
});
