import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateClientCodes() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    CREATE TABLE IF NOT EXISTS "code_sequences" (
      "prefix" text PRIMARY KEY,
      "next_value" integer NOT NULL DEFAULT 1
    )
  `;

  await sql`
    INSERT INTO "code_sequences" ("prefix", "next_value")
    VALUES ('ZGC-ORG', 1), ('ZGC-CON', 1)
    ON CONFLICT ("prefix") DO NOTHING
  `;

  await sql`
    ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "org_code" text
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "clients_org_code_unique"
    ON "clients" ("org_code")
    WHERE "org_code" IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "client_contact_people" (
      "id" text PRIMARY KEY,
      "contact_code" text NOT NULL UNIQUE,
      "client_id" text NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "sort_order" integer NOT NULL DEFAULT 0,
      "name" text,
      "position" text,
      "mobiles" text,
      "emails" text,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  console.log("Client code migration complete.");
  await sql.end();
}

migrateClientCodes().catch((error) => {
  console.error(error);
  process.exit(1);
});
