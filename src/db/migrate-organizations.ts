import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOrganizations() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  const clientsExists = await sql`
    SELECT to_regclass('public.clients') AS name
  `;
  const organizationsExists = await sql`
    SELECT to_regclass('public.organizations') AS name
  `;

  if (clientsExists[0]?.name && !organizationsExists[0]?.name) {
    await sql`ALTER TABLE "clients" RENAME TO "organizations"`;
    console.log("Renamed clients -> organizations.");
  }

  await sql`
    ALTER TABLE "organizations"
    ADD COLUMN IF NOT EXISTS "roles" text
  `;

  await sql`
    UPDATE "organizations"
    SET "roles" = '["client"]'
    WHERE "roles" IS NULL OR "roles" = ''
  `;

  const oldContacts = await sql`
    SELECT to_regclass('public.client_contact_people') AS name
  `;
  const newContacts = await sql`
    SELECT to_regclass('public.organization_contacts') AS name
  `;

  if (oldContacts[0]?.name && !newContacts[0]?.name) {
    await sql`ALTER TABLE "client_contact_people" RENAME TO "organization_contacts"`;
    console.log("Renamed client_contact_people -> organization_contacts.");
  }

  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'organization_contacts'
          AND column_name = 'client_id'
      ) THEN
        ALTER TABLE "organization_contacts"
        RENAME COLUMN "client_id" TO "organization_id";
      END IF;
    END $$;
  `;

  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tasks'
          AND column_name = 'client_id'
      ) THEN
        ALTER TABLE "tasks" RENAME COLUMN "client_id" TO "organization_id";
      END IF;
    END $$;
  `;

  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'drive_files'
          AND column_name = 'client_id'
      ) THEN
        ALTER TABLE "drive_files" RENAME COLUMN "client_id" TO "organization_id";
      END IF;
    END $$;
  `;

  console.log("Organizations migration complete.");
  await sql.end();
}

migrateOrganizations().catch((error) => {
  console.error(error);
  process.exit(1);
});
