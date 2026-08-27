import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateContactKinds() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    ALTER TABLE "organization_contacts"
    ADD COLUMN IF NOT EXISTS "kinds" text NOT NULL DEFAULT '[]'
  `;

  await sql.end();
  console.log("Contact kinds migration complete.");
}

migrateContactKinds().catch((error) => {
  console.error(error);
  process.exit(1);
});
