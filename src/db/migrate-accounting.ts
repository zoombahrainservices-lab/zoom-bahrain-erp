import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateAccounting() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, {
    prepare: false,
    ssl: "require",
    max: 1,
    connect_timeout: 20,
  });

  await sql`SET statement_timeout = '120s'`;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_settings" (
      "company_id" text PRIMARY KEY,
      "currency" text NOT NULL DEFAULT 'BHD',
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_accounts" (
      "id" text PRIMARY KEY,
      "company_id" text NOT NULL,
      "code" text NOT NULL,
      "name" text NOT NULL,
      "account_type" text NOT NULL,
      "subtype" text,
      "parent_id" text,
      "normal_balance" text NOT NULL,
      "is_active" integer NOT NULL DEFAULT 1,
      "is_system" integer NOT NULL DEFAULT 0,
      "currency" text NOT NULL DEFAULT 'BHD',
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "accounting_accounts_company_code_idx"
    ON "accounting_accounts" ("company_id", "code")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_accounts_company_idx"
    ON "accounting_accounts" ("company_id")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_periods" (
      "id" text PRIMARY KEY,
      "company_id" text NOT NULL,
      "name" text NOT NULL,
      "starts_on" date NOT NULL,
      "ends_on" date NOT NULL,
      "status" text NOT NULL DEFAULT 'open',
      "closed_at" timestamptz,
      "closed_by_id" text REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_periods_company_idx"
    ON "accounting_periods" ("company_id")
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "accounting_periods_company_name_idx"
    ON "accounting_periods" ("company_id", "name")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_vat_codes" (
      "id" text PRIMARY KEY,
      "company_id" text NOT NULL,
      "code" text NOT NULL,
      "name" text NOT NULL,
      "rate" numeric(7, 3) NOT NULL,
      "treatment" text NOT NULL,
      "is_active" integer NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "accounting_vat_codes_company_code_idx"
    ON "accounting_vat_codes" ("company_id", "code")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_journals" (
      "id" text PRIMARY KEY,
      "company_id" text NOT NULL,
      "journal_number" text NOT NULL,
      "entry_date" date NOT NULL,
      "description" text NOT NULL,
      "source_type" text NOT NULL,
      "source_id" text,
      "status" text NOT NULL DEFAULT 'draft',
      "reversal_of_id" text,
      "reversed_by_id" text,
      "operation_id" text,
      "operation_entry_id" text,
      "organization_id" text REFERENCES "organizations"("id") ON DELETE SET NULL,
      "contact_id" text REFERENCES "organization_contacts"("id") ON DELETE SET NULL,
      "currency" text NOT NULL DEFAULT 'BHD',
      "posted_at" timestamptz,
      "posted_by_id" text REFERENCES "users"("id"),
      "created_by_id" text NOT NULL REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "accounting_journals_company_number_idx"
    ON "accounting_journals" ("company_id", "journal_number")
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "accounting_journals_source_unique"
    ON "accounting_journals" ("company_id", "source_type", "source_id")
    WHERE "status" = 'posted' AND "source_id" IS NOT NULL AND "reversal_of_id" IS NULL AND "reversed_by_id" IS NULL
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "accounting_journals_one_reversal"
    ON "accounting_journals" ("reversal_of_id")
    WHERE "reversal_of_id" IS NOT NULL
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_journals_company_date_idx"
    ON "accounting_journals" ("company_id", "entry_date")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_journals_entry_idx"
    ON "accounting_journals" ("operation_entry_id")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_journal_lines" (
      "id" text PRIMARY KEY,
      "journal_id" text NOT NULL REFERENCES "accounting_journals"("id") ON DELETE CASCADE,
      "account_id" text NOT NULL REFERENCES "accounting_accounts"("id"),
      "organization_id" text REFERENCES "organizations"("id") ON DELETE SET NULL,
      "contact_id" text REFERENCES "organization_contacts"("id") ON DELETE SET NULL,
      "vat_code_id" text REFERENCES "accounting_vat_codes"("id") ON DELETE SET NULL,
      "description" text NOT NULL DEFAULT '',
      "debit" numeric(14, 3) NOT NULL DEFAULT 0,
      "credit" numeric(14, 3) NOT NULL DEFAULT 0,
      "sort_order" integer NOT NULL DEFAULT 0,
      CONSTRAINT "accounting_journal_lines_side_check" CHECK (
        "debit" >= 0
        AND "credit" >= 0
        AND (
          ("debit" > 0 AND "credit" = 0)
          OR ("credit" > 0 AND "debit" = 0)
        )
      )
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_journal_lines_journal_idx"
    ON "accounting_journal_lines" ("journal_id")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_journal_lines_account_idx"
    ON "accounting_journal_lines" ("account_id")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_journal_lines_organization_idx"
    ON "accounting_journal_lines" ("organization_id")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_payments" (
      "id" text PRIMARY KEY,
      "company_id" text NOT NULL,
      "direction" text NOT NULL,
      "organization_id" text REFERENCES "organizations"("id") ON DELETE SET NULL,
      "contact_id" text REFERENCES "organization_contacts"("id") ON DELETE SET NULL,
      "operation_entry_id" text,
      "journal_id" text REFERENCES "accounting_journals"("id"),
      "amount" numeric(14, 3) NOT NULL,
      "paid_on" date NOT NULL,
      "method" text NOT NULL,
      "reference" text NOT NULL DEFAULT '',
      "created_by_id" text NOT NULL REFERENCES "users"("id"),
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_payments_company_date_idx"
    ON "accounting_payments" ("company_id", "paid_on")
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_payments_entry_idx"
    ON "accounting_payments" ("operation_entry_id")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_bank_accounts" (
      "id" text PRIMARY KEY,
      "company_id" text NOT NULL,
      "account_id" text NOT NULL REFERENCES "accounting_accounts"("id"),
      "name" text NOT NULL,
      "institution" text NOT NULL DEFAULT '',
      "account_number" text NOT NULL DEFAULT '',
      "currency" text NOT NULL DEFAULT 'BHD',
      "kind" text NOT NULL DEFAULT 'bank',
      "is_active" integer NOT NULL DEFAULT 1,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_bank_accounts_company_idx"
    ON "accounting_bank_accounts" ("company_id")
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "accounting_bank_accounts_account_idx"
    ON "accounting_bank_accounts" ("account_id")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "accounting_audit" (
      "id" text PRIMARY KEY,
      "company_id" text NOT NULL,
      "actor_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "action" text NOT NULL,
      "entity_type" text NOT NULL,
      "entity_id" text NOT NULL,
      "detail" text NOT NULL DEFAULT '',
      "created_at" timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "accounting_audit_company_idx"
    ON "accounting_audit" ("company_id", "created_at")
  `;

  const [{ ready }] = await sql`
    SELECT (
      to_regclass('public.accounting_journals') IS NOT NULL
      AND to_regclass('public.accounting_journal_lines') IS NOT NULL
      AND to_regclass('public.accounting_accounts') IS NOT NULL
    ) AS ready
  `;

  await sql.end();
  console.log(
    ready
      ? "Accounting tables are present."
      : "WARNING: accounting tables are still missing.",
  );
}

migrateAccounting().catch((error) => {
  console.error(error);
  process.exit(1);
});
