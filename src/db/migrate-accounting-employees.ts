import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = postgres(url, { prepare: false, ssl: "require", max: 1, connect_timeout: 20 });
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_employees (
      id text PRIMARY KEY,
      company_id text NOT NULL,
      name text NOT NULL,
      job_title text NOT NULL DEFAULT '',
      email text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      salary numeric(14,3) NOT NULL DEFAULT 0,
      scheme text NOT NULL DEFAULT 'sio_bahraini',
      started_on date,
      status text NOT NULL DEFAULT 'active',
      notes text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS accounting_employees_company_idx
    ON accounting_employees (company_id)
  `;
  await sql.end();
  console.log("accounting_employees ready");
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
