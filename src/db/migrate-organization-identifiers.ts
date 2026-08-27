import { sql } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env.local" });

import { db } from "@/db";

async function migrateOrganizationIdentifiers() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "organization_identifiers" (
      "id" text PRIMARY KEY,
      "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "country_code" text,
      "identifier_type" text NOT NULL,
      "identifier_label" text NOT NULL,
      "identifier_value" text NOT NULL,
      "is_primary" integer NOT NULL DEFAULT 0,
      "issuing_authority" text,
      "expiry_date" text,
      "sort_order" integer NOT NULL DEFAULT 0,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    UPDATE "organizations"
    SET "country" = 'BH'
    WHERE "country" IS NULL
       OR btrim("country") = ''
       OR lower(btrim("country")) = 'bahrain'
  `);

  await db.execute(sql`
    INSERT INTO "organization_identifiers" (
      "id",
      "organization_id",
      "country_code",
      "identifier_type",
      "identifier_label",
      "identifier_value",
      "is_primary",
      "sort_order"
    )
    SELECT
      md5(org.id || ':commercial_registration'),
      org.id,
      coalesce(nullif(btrim(org.country), ''), 'BH'),
      'commercial_registration',
      'Commercial Registration (CR) Number',
      btrim(org.commercial_registration),
      1,
      0
    FROM "organizations" org
    WHERE org.commercial_registration IS NOT NULL
      AND btrim(org.commercial_registration) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM "organization_identifiers" ident
        WHERE ident.organization_id = org.id
          AND ident.identifier_type = 'commercial_registration'
      )
  `);

  await db.execute(sql`
    INSERT INTO "organization_identifiers" (
      "id",
      "organization_id",
      "country_code",
      "identifier_type",
      "identifier_label",
      "identifier_value",
      "is_primary",
      "sort_order"
    )
    SELECT
      md5(org.id || ':vat_registration'),
      org.id,
      coalesce(nullif(btrim(org.country), ''), 'BH'),
      'vat_registration',
      'VAT Account Number',
      btrim(org.vat_account_number),
      0,
      1
    FROM "organizations" org
    WHERE org.vat_account_number IS NOT NULL
      AND btrim(org.vat_account_number) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM "organization_identifiers" ident
        WHERE ident.organization_id = org.id
          AND ident.identifier_type = 'vat_registration'
      )
  `);

  console.log("Organization identifiers table ready.");
}

migrateOrganizationIdentifiers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
