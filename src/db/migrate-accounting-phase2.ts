import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = postgres(url, { prepare: false, ssl: "require", max: 1, connect_timeout: 20 });
  await sql`SET statement_timeout = '120s'`;

  const add = async (statement: string) => {
    await sql.unsafe(statement);
  };

  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS legal_name text NOT NULL DEFAULT ''`);
  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT ''`);
  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT ''`);
  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''`);
  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS cr_number text NOT NULL DEFAULT ''`);
  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS vat_registered integer NOT NULL DEFAULT 0`);
  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS vat_number text NOT NULL DEFAULT ''`);
  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS vat_effective_from date`);
  await add(`ALTER TABLE accounting_settings ADD COLUMN IF NOT EXISTS filing_frequency text NOT NULL DEFAULT 'quarterly'`);
  await add(`ALTER TABLE accounting_journals ADD COLUMN IF NOT EXISTS bill_id text`);
  await add(`ALTER TABLE accounting_payments ADD COLUMN IF NOT EXISTS bill_id text`);
  await add(`CREATE INDEX IF NOT EXISTS accounting_payments_bill_idx ON accounting_payments (bill_id)`);

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_bills (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      bill_number text NOT NULL,
      document_kind text NOT NULL DEFAULT 'bill',
      supplier_organization_id text REFERENCES organizations(id) ON DELETE SET NULL,
      bill_date date NOT NULL,
      due_date date NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      currency text NOT NULL DEFAULT 'BHD',
      exchange_rate numeric(14, 6) NOT NULL DEFAULT 1,
      reference text NOT NULL DEFAULT '',
      notes text NOT NULL DEFAULT '',
      operation_id text,
      credit_of_bill_id text,
      subtotal numeric(14, 3) NOT NULL DEFAULT 0,
      discount_total numeric(14, 3) NOT NULL DEFAULT 0,
      vat_total numeric(14, 3) NOT NULL DEFAULT 0,
      total numeric(14, 3) NOT NULL DEFAULT 0,
      journal_id text,
      created_by_id text NOT NULL REFERENCES users(id),
      approved_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounting_bills_company_number_idx ON accounting_bills (company_id, bill_number)`;
  await sql`CREATE INDEX IF NOT EXISTS accounting_bills_company_date_idx ON accounting_bills (company_id, bill_date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_bill_lines (
      id text PRIMARY KEY,
      bill_id text NOT NULL REFERENCES accounting_bills(id) ON DELETE CASCADE,
      expense_account_id text NOT NULL REFERENCES accounting_accounts(id),
      vat_code_id text REFERENCES accounting_vat_codes(id),
      description text NOT NULL DEFAULT '',
      quantity numeric(14, 3) NOT NULL,
      unit_amount numeric(14, 3) NOT NULL,
      discount numeric(14, 3) NOT NULL DEFAULT 0,
      net_amount numeric(14, 3) NOT NULL,
      vat_amount numeric(14, 3) NOT NULL,
      line_total numeric(14, 3) NOT NULL,
      sort_order integer NOT NULL DEFAULT 0
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS accounting_bill_lines_bill_idx ON accounting_bill_lines (bill_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_expenses (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      expense_number text NOT NULL,
      expense_date date NOT NULL,
      account_id text NOT NULL REFERENCES accounting_accounts(id),
      organization_id text REFERENCES organizations(id) ON DELETE SET NULL,
      operation_id text,
      description text NOT NULL,
      reference text NOT NULL DEFAULT '',
      method text NOT NULL,
      bank_account_id text,
      vat_code_id text REFERENCES accounting_vat_codes(id),
      currency text NOT NULL DEFAULT 'BHD',
      exchange_rate numeric(14, 6) NOT NULL DEFAULT 1,
      net_amount numeric(14, 3) NOT NULL,
      vat_amount numeric(14, 3) NOT NULL,
      total_amount numeric(14, 3) NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      journal_id text,
      created_by_id text NOT NULL REFERENCES users(id),
      approved_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounting_expenses_company_number_idx ON accounting_expenses (company_id, expense_number)`;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_attachments (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      entity_type text NOT NULL,
      entity_id text NOT NULL,
      file_name text NOT NULL,
      mime_type text NOT NULL DEFAULT 'application/octet-stream',
      storage_path text NOT NULL,
      uploaded_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS accounting_attachments_entity_idx ON accounting_attachments (entity_type, entity_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_exchange_rates (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      currency text NOT NULL,
      rate_to_bhd numeric(14, 6) NOT NULL,
      effective_on date NOT NULL,
      created_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_statements (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      bank_account_id text NOT NULL REFERENCES accounting_bank_accounts(id),
      file_name text NOT NULL DEFAULT '',
      statement_date date NOT NULL,
      imported_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_statement_lines (
      id text PRIMARY KEY,
      statement_id text NOT NULL REFERENCES accounting_statements(id) ON DELETE CASCADE,
      bank_account_id text NOT NULL,
      line_date date NOT NULL,
      amount numeric(14, 3) NOT NULL,
      description text NOT NULL DEFAULT '',
      reference text NOT NULL DEFAULT '',
      fingerprint text NOT NULL
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounting_statement_lines_fingerprint_idx ON accounting_statement_lines (bank_account_id, fingerprint)`;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_reconciliations (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      bank_account_id text NOT NULL REFERENCES accounting_bank_accounts(id),
      period_start date NOT NULL,
      period_end date NOT NULL,
      statement_balance numeric(14, 3) NOT NULL,
      ledger_balance numeric(14, 3) NOT NULL,
      difference numeric(14, 3) NOT NULL,
      status text NOT NULL DEFAULT 'open',
      completed_at timestamptz,
      completed_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_reconciliation_matches (
      id text PRIMARY KEY,
      reconciliation_id text NOT NULL REFERENCES accounting_reconciliations(id) ON DELETE CASCADE,
      match_group text NOT NULL,
      statement_line_id text REFERENCES accounting_statement_lines(id),
      journal_line_id text REFERENCES accounting_journal_lines(id),
      amount numeric(14, 3) NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounting_vat_returns (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      period_start date NOT NULL,
      period_end date NOT NULL,
      due_on date NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      output_vat numeric(14, 3) NOT NULL,
      input_vat numeric(14, 3) NOT NULL,
      net_vat numeric(14, 3) NOT NULL,
      preparer_id text REFERENCES users(id),
      reviewer_id text REFERENCES users(id),
      filing_reference text NOT NULL DEFAULT '',
      payment_status text NOT NULL DEFAULT 'unpaid',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS accounting_vat_returns_period_idx ON accounting_vat_returns (company_id, period_start, period_end)`;

  await sql.end();
  console.log("Accounting phase 2 tables are present.");
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
