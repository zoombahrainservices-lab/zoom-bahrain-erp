import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function purgeOperations() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, {
    prepare: false,
    ssl: "require",
    max: 1,
    connect_timeout: 20,
  });

  await sql`SET statement_timeout = '120s'`;

  const [{ entries }] = await sql`
    SELECT count(*)::int AS entries FROM operation_entries
  `;
  const [{ operations }] = await sql`
    SELECT count(*)::int AS operations FROM operations
  `;

  await sql`DELETE FROM operations`;

  await sql`
    INSERT INTO code_sequences (prefix, next_value)
    VALUES ('ZGC-OPS', 1)
    ON CONFLICT (prefix) DO UPDATE SET next_value = 1
  `;

  await sql.end();
  console.log(
    `Purged ${operations} operations and ${entries} thread entries. Next code is ZGC-OPS-00001.`,
  );
}

purgeOperations().catch((error) => {
  console.error(error);
  process.exit(1);
});
