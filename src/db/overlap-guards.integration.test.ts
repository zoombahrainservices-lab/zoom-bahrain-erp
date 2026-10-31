import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";

import { applyOverlapGuards } from "./migrate-overlap-guards";

const url = process.env.OVERLAP_GUARD_DATABASE_URL ?? "";
const isolated = url.includes("127.0.0.1") || url.includes("localhost");

test("overlap guard migration preserves rows, rejects conflicts, and can be re-run", { skip: isolated ? false : "isolated database was not configured" }, async () => {
  const sql = postgres(url, { prepare: false, ssl: false, max: 1 });
  await sql`DROP TABLE IF EXISTS accounting_journals`;
  await sql`DROP TABLE IF EXISTS accounting_expenses`;
  await sql`
    CREATE TABLE accounting_journals (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      status text NOT NULL,
      reversed_by_id text,
      reversal_of_id text,
      operation_entry_id text,
      source_type text NOT NULL
    )
  `;
  await sql`
    CREATE TABLE accounting_expenses (
      id text PRIMARY KEY,
      status text NOT NULL
    )
  `;
  await sql`
    INSERT INTO accounting_journals
    VALUES ('j1', 'co', 'posted', null, null, 'entry-1', 'procurement'),
           ('j2', 'co', 'posted', null, null, 'entry-1', 'supplier_bill')
  `;
  await sql`INSERT INTO accounting_expenses (id, status) VALUES ('e1', 'posted')`;

  await assert.rejects(() => applyOverlapGuards(sql), /Confirmed purchase journals/);
  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'accounting_expenses' AND column_name = 'operation_entry_id'
  `;
  assert.equal(columns.length, 0);
  const indexes = await sql`
    SELECT indexname FROM pg_indexes
    WHERE indexname IN (
      'accounting_journals_purchase_entry_once',
      'accounting_journals_cost_entry_once',
      'accounting_expenses_cost_entry_idx'
    )
  `;
  assert.equal(indexes.length, 0);
  assert.equal((await sql`SELECT count(*)::int AS n FROM accounting_expenses`)[0]?.n, 1);
  assert.equal((await sql`SELECT count(*)::int AS n FROM accounting_journals`)[0]?.n, 2);

  await sql`DELETE FROM accounting_journals`;
  await sql`
    INSERT INTO accounting_journals
    VALUES ('j3', 'co', 'posted', null, null, null, 'supplier_bill')
  `;
  await applyOverlapGuards(sql);
  await applyOverlapGuards(sql);
  const preserved = await sql`SELECT operation_entry_id FROM accounting_expenses WHERE id = 'e1'`;
  assert.equal(preserved[0]?.operation_entry_id, null);

  await sql`UPDATE accounting_expenses SET operation_entry_id = 'cost-1' WHERE id = 'e1'`;
  await assert.rejects(() => sql`
    INSERT INTO accounting_expenses (id, status, operation_entry_id) VALUES ('e2', 'posted', 'cost-1')
  `);
  await sql`UPDATE accounting_expenses SET status = 'reversed' WHERE id = 'e1'`;
  await sql`INSERT INTO accounting_expenses (id, status, operation_entry_id) VALUES ('e2', 'posted', 'cost-1')`;

  await sql`
    INSERT INTO accounting_journals (id, company_id, status, reversed_by_id, reversal_of_id, operation_entry_id, source_type)
    VALUES ('p1', 'co', 'posted', null, null, 'buy-1', 'procurement')
  `;
  await assert.rejects(() => sql`
    INSERT INTO accounting_journals (id, company_id, status, reversed_by_id, reversal_of_id, operation_entry_id, source_type)
    VALUES ('p2', 'co', 'posted', null, null, 'buy-1', 'supplier_bill')
  `);
  await sql`UPDATE accounting_journals SET reversed_by_id = 'rev-1' WHERE id = 'p1'`;
  await sql`
    INSERT INTO accounting_journals (id, company_id, status, reversed_by_id, reversal_of_id, operation_entry_id, source_type)
    VALUES ('p2', 'co', 'posted', null, null, 'buy-1', 'supplier_bill')
  `;
  assert.equal((await sql`SELECT id, status FROM accounting_expenses WHERE id = 'e1'`)[0]?.status, "reversed");
  await sql.end({ timeout: 5 });
});
