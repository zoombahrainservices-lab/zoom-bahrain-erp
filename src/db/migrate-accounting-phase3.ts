import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = postgres(url, { prepare: false, ssl: "require", max: 1, connect_timeout: 20 });
  await sql`SET statement_timeout = '120s'`;
  const add = (statement: string) => sql.unsafe(statement);

  await add(`ALTER TABLE operation_entries ADD COLUMN IF NOT EXISTS issued_on date`);
  await add(`ALTER TABLE operation_entries ADD COLUMN IF NOT EXISTS due_on date`);
  await add(`ALTER TABLE operation_entries ADD COLUMN IF NOT EXISTS payment_terms text NOT NULL DEFAULT ''`);
  await add(`ALTER TABLE operation_entries ADD COLUMN IF NOT EXISTS tax_version integer NOT NULL DEFAULT 0`);
  await add(`ALTER TABLE operation_document_lines ADD COLUMN IF NOT EXISTS discount numeric(12,3) NOT NULL DEFAULT 0`);
  await add(`ALTER TABLE operation_document_lines ADD COLUMN IF NOT EXISTS vat_code_id text`);
  await add(`ALTER TABLE operation_document_lines ADD COLUMN IF NOT EXISTS net_amount numeric(12,3)`);
  await add(`ALTER TABLE operation_document_lines ADD COLUMN IF NOT EXISTS vat_amount numeric(12,3)`);
  await add(`ALTER TABLE operation_document_lines ADD COLUMN IF NOT EXISTS line_total numeric(12,3)`);
  await add(`ALTER TABLE accounting_bills ADD COLUMN IF NOT EXISTS procurement_entry_id text`);
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS accounting_bills_procurement_idx
    ON accounting_bills (procurement_entry_id)
    WHERE procurement_entry_id IS NOT NULL AND status <> 'reversed'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_exceptions (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      kind text NOT NULL,
      source_type text NOT NULL,
      source_id text NOT NULL,
      detail text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_notifications (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      user_id text REFERENCES users(id) ON DELETE CASCADE,
      kind text NOT NULL,
      title text NOT NULL,
      body text NOT NULL DEFAULT '',
      href text NOT NULL DEFAULT '',
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_notification_preferences (
      user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email_enabled integer NOT NULL DEFAULT 0,
      in_app_enabled integer NOT NULL DEFAULT 1
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_emails (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      template text NOT NULL,
      reminder_key text NOT NULL DEFAULT '',
      entity_type text NOT NULL,
      entity_id text NOT NULL,
      to_address text NOT NULL,
      subject text NOT NULL,
      body text NOT NULL,
      status text NOT NULL DEFAULT 'queued',
      provider_id text NOT NULL DEFAULT '',
      attempts integer NOT NULL DEFAULT 0,
      last_error text NOT NULL DEFAULT '',
      created_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounting_emails_once_idx ON accounting_emails (entity_type, entity_id, template, reminder_key)`;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_reminder_rules (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      days_offset integer NOT NULL,
      is_active integer NOT NULL DEFAULT 1
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_intercompany (
      id text PRIMARY KEY,
      group_ref text NOT NULL,
      from_company_id text NOT NULL,
      to_company_id text NOT NULL,
      kind text NOT NULL,
      amount numeric(14,3) NOT NULL,
      entry_date date NOT NULL,
      description text NOT NULL,
      from_journal_id text,
      to_journal_id text,
      created_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_items (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      sku text NOT NULL,
      name text NOT NULL,
      category text NOT NULL DEFAULT '',
      unit text NOT NULL DEFAULT 'ea',
      ownership text NOT NULL DEFAULT 'company',
      reorder_level numeric(14,3) NOT NULL DEFAULT 0,
      average_cost numeric(14,3) NOT NULL DEFAULT 0,
      quantity numeric(14,3) NOT NULL DEFAULT 0,
      allow_negative integer NOT NULL DEFAULT 0,
      is_active integer NOT NULL DEFAULT 1
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounting_items_sku_idx ON accounting_items (company_id, sku)`;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_warehouses (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      name text NOT NULL,
      is_active integer NOT NULL DEFAULT 1
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_locations (
      id text PRIMARY KEY,
      warehouse_id text NOT NULL REFERENCES accounting_warehouses(id),
      name text NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_stock_moves (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      item_id text NOT NULL REFERENCES accounting_items(id),
      warehouse_id text NOT NULL REFERENCES accounting_warehouses(id),
      location_id text REFERENCES accounting_locations(id),
      kind text NOT NULL,
      quantity numeric(14,3) NOT NULL,
      unit_cost numeric(14,3) NOT NULL DEFAULT 0,
      journal_id text,
      moved_on date NOT NULL,
      note text NOT NULL DEFAULT '',
      created_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_payroll_runs (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      period_label text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      gross numeric(14,3) NOT NULL,
      deductions numeric(14,3) NOT NULL DEFAULT 0,
      statutory numeric(14,3) NOT NULL DEFAULT 0,
      net_pay numeric(14,3) NOT NULL,
      journal_id text,
      payment_journal_id text,
      created_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_access_grants (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id text NOT NULL,
      role_key text NOT NULL
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounting_access_user_company_idx ON accounting_access_grants (user_id, company_id)`;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_approval_policies (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      document_type text NOT NULL,
      threshold numeric(14,3) NOT NULL DEFAULT 0,
      block_self integer NOT NULL DEFAULT 1
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_approval_events (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      entity_type text NOT NULL,
      entity_id text NOT NULL,
      stage text NOT NULL,
      actor_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql.end();
  console.log("Accounting phase 3 tables are present. Existing invoices keep tax_version 0 and are not reposted.");
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
