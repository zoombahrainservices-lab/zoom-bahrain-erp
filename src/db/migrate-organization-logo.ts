import { sql } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

import { db } from "@/db";

async function migrateOrganizationLogo() {
  await db.execute(sql`
    ALTER TABLE "organizations"
    ADD COLUMN IF NOT EXISTS "drive_folder_id" text,
    ADD COLUMN IF NOT EXISTS "logo_drive_file_id" text,
    ADD COLUMN IF NOT EXISTS "logo_mime_type" text
  `);

  console.log("Organization logo and Drive folder columns ready.");
}

migrateOrganizationLogo().catch((error) => {
  console.error(error);
  process.exit(1);
});
