import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateProcurementActivityType() {
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
    INSERT INTO "operation_activity_types"
      ("id", "slug", "label", "money_kind", "sort_order")
    VALUES
      ('oat-procurement', 'procurement', 'Procurement', 'out', 45)
    ON CONFLICT ("slug") DO UPDATE SET
      "label" = EXCLUDED."label",
      "money_kind" = EXCLUDED."money_kind",
      "sort_order" = EXCLUDED."sort_order"
  `;

  await sql.end();
  console.log("Procurement activity type is present.");
}

migrateProcurementActivityType().catch((error) => {
  console.error(error);
  process.exit(1);
});
