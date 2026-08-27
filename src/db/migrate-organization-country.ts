import { sql } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

import { db } from "@/db";

async function migrateOrganizationCountry() {
  await db.execute(sql`
    ALTER TABLE "organizations"
    ADD COLUMN IF NOT EXISTS "country" text
  `);

  console.log("Organization country column ready.");
}

migrateOrganizationCountry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
