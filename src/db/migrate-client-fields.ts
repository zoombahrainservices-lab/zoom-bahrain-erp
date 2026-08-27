import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const clientColumns = [
  "nature_of_business",
  "trading_group_name",
  "commercial_registration",
  "vat_account_number",
  "registered_address",
  "company_phone",
  "company_phones",
  "website",
  "sales_email",
  "admin_email",
  "company_emails",
  "client_contacts",
  "primary_contact_name",
  "primary_contact_position",
  "primary_contact_mobile",
  "primary_contact_email",
  "primary_contact_mobiles",
  "primary_contact_emails",
  "secondary_contact_name",
  "secondary_contact_position",
  "secondary_contact_mobile",
  "secondary_contact_mobiles",
  "secondary_contact_emails",
] as const;

async function migrateClientFields() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  for (const column of clientColumns) {
    await sql.unsafe(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "${column}" text`,
    );
    console.log(`Added column clients.${column} (if missing).`);
  }

  await sql.end();
  console.log("Client field migration complete.");
}

migrateClientFields().catch((error) => {
  console.error(error);
  process.exit(1);
});
