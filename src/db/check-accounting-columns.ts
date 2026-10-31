import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = postgres(url, { prepare: false, ssl: "require", max: 1 });
  const rows = await sql<{ column_name: string }[]>`
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'accounting_settings'
    order by column_name
  `;
  console.log(rows.map((row) => row.column_name).join(","));
  const bills = await sql<{ name: string | null }[]>`
    select to_regclass('public.accounting_bills') as name
  `;
  console.log("bills", bills[0]?.name);
  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
