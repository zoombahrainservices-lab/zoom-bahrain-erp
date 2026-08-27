import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateContactImagesAbout() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    ALTER TABLE "organization_contacts"
    ADD COLUMN IF NOT EXISTS "about" text
  `;

  await sql`
    ALTER TABLE "organization_contacts"
    ADD COLUMN IF NOT EXISTS "drive_folder_id" text
  `;

  await sql`
    ALTER TABLE "drive_files"
    ALTER COLUMN "organization_id" DROP NOT NULL
  `;

  await sql`
    ALTER TABLE "drive_files"
    ADD COLUMN IF NOT EXISTS "contact_id" text
    REFERENCES "organization_contacts"("id") ON DELETE CASCADE
  `;

  await sql.end();
  console.log("Contact images and about migration complete.");
}

migrateContactImagesAbout().catch((error) => {
  console.error(error);
  process.exit(1);
});
