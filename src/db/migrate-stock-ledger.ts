import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = postgres(url, { prepare: false, ssl: "require", max: 1, connect_timeout: 20 });
  await sql`SET statement_timeout = '120s'`;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_documents (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      kind text NOT NULL,
      purpose text NOT NULL,
      ownership text NOT NULL,
      owner_id text NOT NULL,
      warehouse_id text NOT NULL REFERENCES accounting_warehouses(id),
      location_id text NOT NULL REFERENCES accounting_locations(id),
      to_warehouse_id text REFERENCES accounting_warehouses(id),
      to_location_id text REFERENCES accounting_locations(id),
      moved_on date NOT NULL,
      source_type text NOT NULL DEFAULT '',
      source_id text,
      procurement_entry_id text,
      bill_id text,
      reversal_of_id text,
      reversed_by_id text,
      note text NOT NULL DEFAULT '',
      created_by_id text NOT NULL REFERENCES users(id),
      approved_by_id text REFERENCES users(id),
      posted_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      approved_at timestamptz,
      posted_at timestamptz
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS stock_documents_company_idx ON stock_documents (company_id, status)`;
  await sql`CREATE INDEX IF NOT EXISTS stock_documents_owner_idx ON stock_documents (company_id, ownership, owner_id)`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS stock_documents_one_reversal
    ON stock_documents (reversal_of_id)
    WHERE reversal_of_id IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_document_lines (
      id text PRIMARY KEY,
      document_id text NOT NULL REFERENCES stock_documents(id),
      line_key text NOT NULL,
      idempotency_key text NOT NULL,
      sku text NOT NULL,
      item_name text NOT NULL DEFAULT '',
      unit text NOT NULL DEFAULT 'ea',
      quantity numeric(14,3) NOT NULL,
      unit_cost numeric(14,3),
      valuation_status text NOT NULL,
      sort_order integer NOT NULL DEFAULT 0
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS stock_document_lines_key_idx ON stock_document_lines (document_id, line_key)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS stock_document_lines_idempotency_idx ON stock_document_lines (idempotency_key)`;
  await sql`CREATE INDEX IF NOT EXISTS stock_document_lines_sku_idx ON stock_document_lines (sku)`;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      document_id text NOT NULL REFERENCES stock_documents(id),
      document_line_id text NOT NULL REFERENCES stock_document_lines(id),
      idempotency_key text NOT NULL,
      sku text NOT NULL,
      item_name text NOT NULL DEFAULT '',
      unit text NOT NULL DEFAULT 'ea',
      ownership text NOT NULL,
      owner_id text NOT NULL,
      warehouse_id text NOT NULL REFERENCES accounting_warehouses(id),
      location_id text NOT NULL REFERENCES accounting_locations(id),
      purpose text NOT NULL,
      direction text NOT NULL,
      owner_effect text NOT NULL,
      quantity numeric(14,3) NOT NULL,
      unit_cost numeric(14,3),
      value_impact numeric(14,3) NOT NULL DEFAULT 0,
      valuation_status text NOT NULL,
      posting_status text NOT NULL DEFAULT 'posted',
      moved_on date NOT NULL,
      journal_id text,
      journal_debit_code text,
      journal_credit_code text,
      journal_block_reason text NOT NULL DEFAULT '',
      reversal_of_id text,
      reversed_by_id text,
      created_by_id text NOT NULL REFERENCES users(id),
      approved_by_id text REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_idempotency_idx ON stock_movements (idempotency_key)`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_one_reversal
    ON stock_movements (reversal_of_id)
    WHERE reversal_of_id IS NOT NULL
  `;
  await sql`CREATE INDEX IF NOT EXISTS stock_movements_owner_idx ON stock_movements (company_id, sku, ownership, owner_id)`;
  await sql`CREATE INDEX IF NOT EXISTS stock_movements_document_idx ON stock_movements (document_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_owner_balances (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      sku text NOT NULL,
      ownership text NOT NULL,
      owner_id text NOT NULL,
      quantity numeric(14,3) NOT NULL DEFAULT 0,
      pending_quantity numeric(14,3) NOT NULL DEFAULT 0,
      average_cost numeric(14,3) NOT NULL DEFAULT 0,
      inventory_value numeric(14,3) NOT NULL DEFAULT 0,
      allow_negative integer NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS stock_owner_balances_identity_idx
    ON stock_owner_balances (company_id, sku, ownership, owner_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_location_balances (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      sku text NOT NULL,
      ownership text NOT NULL,
      owner_id text NOT NULL,
      warehouse_id text NOT NULL REFERENCES accounting_warehouses(id),
      location_id text NOT NULL REFERENCES accounting_locations(id),
      quantity numeric(14,3) NOT NULL DEFAULT 0,
      pending_quantity numeric(14,3) NOT NULL DEFAULT 0
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS stock_location_balances_identity_idx
    ON stock_location_balances (company_id, sku, ownership, owner_id, warehouse_id, location_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_opening_proposals (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      sku text NOT NULL,
      ownership text NOT NULL,
      owner_id text NOT NULL,
      warehouse_id text NOT NULL REFERENCES accounting_warehouses(id),
      location_id text NOT NULL REFERENCES accounting_locations(id),
      quantity numeric(14,3) NOT NULL,
      average_cost numeric(14,3) NOT NULL DEFAULT 0,
      cutover_date date NOT NULL,
      legacy_item_id text,
      status text NOT NULL DEFAULT 'proposed',
      note text NOT NULL DEFAULT '',
      created_by_id text NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS stock_opening_proposals_identity_idx
    ON stock_opening_proposals (company_id, sku, ownership, owner_id, warehouse_id, location_id, cutover_date)
  `;
  await sql`ALTER TABLE stock_documents ADD COLUMN IF NOT EXISTS reference text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE stock_documents ADD COLUMN IF NOT EXISTS counterparty text NOT NULL DEFAULT ''`;

  await sql.end();
  console.log("Stock ledger tables are present. Existing inventory quantities, costs, and journals were not changed.");
}

async function rollback() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = postgres(url, { prepare: false, ssl: "require", max: 1, connect_timeout: 20 });
  await sql`DROP TABLE IF EXISTS stock_opening_proposals`;
  await sql`DROP TABLE IF EXISTS stock_location_balances`;
  await sql`DROP TABLE IF EXISTS stock_owner_balances`;
  await sql`DROP TABLE IF EXISTS stock_movements`;
  await sql`DROP TABLE IF EXISTS stock_document_lines`;
  await sql`DROP TABLE IF EXISTS stock_documents`;
  await sql.end();
  console.log("Stock ledger tables dropped. Legacy inventory tables were not changed.");
}

const run = process.env.STOCK_LEDGER_ROLLBACK === "1" ? rollback : migrate;
run().catch((error) => {
  console.error(error);
  process.exit(1);
});
