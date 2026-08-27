import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const defaults = [
  { slug: "note", label: "Update", moneyKind: "none", sortOrder: 10 },
  { slug: "meeting", label: "Call / meeting", moneyKind: "none", sortOrder: 20 },
  { slug: "task", label: "To-do", moneyKind: "none", sortOrder: 30 },
  { slug: "document", label: "Document", moneyKind: "none", sortOrder: 40 },
  { slug: "quotation", label: "Quotation", moneyKind: "in", sortOrder: 50 },
  { slug: "invoice", label: "Invoice", moneyKind: "in", sortOrder: 60 },
  { slug: "cost", label: "Cost", moneyKind: "out", sortOrder: 70 },
  { slug: "proposal", label: "Proposal", moneyKind: "none", sortOrder: 80 },
  { slug: "request", label: "Request", moneyKind: "none", sortOrder: 90 },
  { slug: "incident", label: "Incident", moneyKind: "none", sortOrder: 100 },
  { slug: "recurring", label: "Recurring", moneyKind: "none", sortOrder: 110 },
  { slug: "other", label: "Other", moneyKind: "none", sortOrder: 120 },
] as const;

async function migrateOperationActivityTypes() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require", max: 1, connect_timeout: 20 });

  await sql`SET statement_timeout = '120s'`;

  await sql`
    CREATE TABLE IF NOT EXISTS "operation_activity_types" (
      "id" text PRIMARY KEY,
      "slug" text NOT NULL UNIQUE,
      "label" text NOT NULL,
      "money_kind" text NOT NULL DEFAULT 'none',
      "sort_order" integer NOT NULL DEFAULT 100,
      "created_by_id" text REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  for (const type of defaults) {
    await sql`
      INSERT INTO "operation_activity_types"
        ("id", "slug", "label", "money_kind", "sort_order")
      VALUES
        (${`oat-${type.slug}`}, ${type.slug}, ${type.label}, ${type.moneyKind}, ${type.sortOrder})
      ON CONFLICT ("slug") DO UPDATE SET
        "label" = EXCLUDED."label",
        "money_kind" = EXCLUDED."money_kind",
        "sort_order" = EXCLUDED."sort_order"
    `;
  }

  await sql.end();
  console.log("Operation activity types migration complete.");
}

migrateOperationActivityTypes().catch((error) => {
  console.error(error);
  process.exit(1);
});
