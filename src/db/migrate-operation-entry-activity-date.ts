import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOperationEntryActivityDate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    ALTER TABLE "operation_entries"
    ADD COLUMN IF NOT EXISTS "activity_date" date
  `;

  await sql`
    UPDATE "operation_entries"
    SET "activity_date" = ("created_at" AT TIME ZONE 'UTC')::date
    WHERE "activity_date" IS NULL
  `;

  await sql`
    ALTER TABLE "operation_entries"
    ALTER COLUMN "activity_date" SET NOT NULL
  `;

  await sql.end();
  console.log("Operation entry activity date migration complete.");
}

migrateOperationEntryActivityDate().catch((error) => {
  console.error(error);
  process.exit(1);
});
