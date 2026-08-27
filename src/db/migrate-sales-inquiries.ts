import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateSalesInquiries() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    CREATE TABLE IF NOT EXISTS "sales_inquiries" (
      "id" text PRIMARY KEY,
      "inquiry_code" text NOT NULL UNIQUE,
      "name" text,
      "phone" text,
      "email" text,
      "subject" text,
      "status" text NOT NULL DEFAULT 'open',
      "converted_contact_id" text REFERENCES "organization_contacts"("id") ON DELETE SET NULL,
      "converted_organization_id" text REFERENCES "organizations"("id") ON DELETE SET NULL,
      "created_by_id" text NOT NULL REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    INSERT INTO code_sequences (prefix, next_value)
    VALUES ('ZGC-INQ', 1)
    ON CONFLICT (prefix) DO NOTHING
  `;

  await sql.end();
  console.log("Sales inquiries migration complete.");
}

migrateSalesInquiries().catch((error) => {
  console.error(error);
  process.exit(1);
});
