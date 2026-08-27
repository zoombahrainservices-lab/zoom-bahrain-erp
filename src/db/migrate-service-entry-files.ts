import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateServiceEntryFiles() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    ALTER TABLE "services"
    ADD COLUMN IF NOT EXISTS "drive_folder_id" text
  `;

  await sql`
    ALTER TABLE "drive_files"
    ADD COLUMN IF NOT EXISTS "service_entry_id" text
      REFERENCES "service_entries"("id") ON DELETE CASCADE
  `;

  await sql.end();
  console.log("Service entry files migration complete.");
}

migrateServiceEntryFiles().catch((error) => {
  console.error(error);
  process.exit(1);
});
