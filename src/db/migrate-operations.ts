import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOperations() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    CREATE TABLE IF NOT EXISTS "operations" (
      "id" text PRIMARY KEY,
      "operation_code" text NOT NULL UNIQUE,
      "organization_id" text REFERENCES "organizations"("id") ON DELETE SET NULL,
      "contact_id" text REFERENCES "organization_contacts"("id") ON DELETE SET NULL,
      "division_id" text NOT NULL DEFAULT 'group',
      "title" text NOT NULL DEFAULT '',
      "status" text NOT NULL DEFAULT 'active',
      "assigned_to_id" text REFERENCES "users"("id"),
      "created_by_id" text NOT NULL REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "operation_entries" (
      "id" text PRIMARY KEY,
      "operation_id" text NOT NULL REFERENCES "operations"("id") ON DELETE CASCADE,
      "entry_type" text NOT NULL,
      "body" text NOT NULL DEFAULT '',
      "status" text NOT NULL DEFAULT 'open',
      "assigned_to_id" text REFERENCES "users"("id"),
      "created_by_id" text NOT NULL REFERENCES "users"("id"),
      "activity_date" date NOT NULL DEFAULT CURRENT_DATE,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    INSERT INTO code_sequences (prefix, next_value)
    VALUES ('ZGC-OPS', 1)
    ON CONFLICT (prefix) DO NOTHING
  `;

  await sql.end();
  console.log("Operations migration complete.");
}

migrateOperations().catch((error) => {
  console.error(error);
  process.exit(1);
});
