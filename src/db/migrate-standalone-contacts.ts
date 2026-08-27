import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateStandaloneContacts() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    ALTER TABLE "organization_contacts"
    ALTER COLUMN "organization_id" DROP NOT NULL
  `;

  await sql`
    ALTER TABLE "organization_contacts"
    ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active'
  `;

  await sql`
    ALTER TABLE "organization_contacts"
    ADD COLUMN IF NOT EXISTS "notes" text
  `;

  await sql.end();
  console.log("Standalone contacts migration complete.");
}

migrateStandaloneContacts().catch((error) => {
  console.error(error);
  process.exit(1);
});
