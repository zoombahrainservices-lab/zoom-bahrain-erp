import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateOperationTitle() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    ALTER TABLE "operations"
    ADD COLUMN IF NOT EXISTS "title" text NOT NULL DEFAULT ''
  `;

  const hasIntent = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'operations'
        AND column_name = 'intent'
    ) AS exists
  `;

  if (hasIntent[0]?.exists) {
    await sql`
      UPDATE "operations"
      SET "title" = CASE
        WHEN COALESCE("title", '') <> '' THEN "title"
        WHEN "intent" = 'proposal' THEN 'Proposal'
        WHEN "intent" = 'quotation' THEN 'Quotation'
        WHEN "intent" = 'invoice' THEN 'Invoice'
        ELSE 'Operation'
      END
      WHERE COALESCE("title", '') = ''
    `;

    await sql`ALTER TABLE "operations" DROP COLUMN "intent"`;
    console.log("Dropped operations.intent column");
  }

  await sql.end();
  console.log("Operation title migration complete.");
}

migrateOperationTitle().catch((error) => {
  console.error(error);
  process.exit(1);
});
