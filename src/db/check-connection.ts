import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl, getEnvStatus } from "@/lib/env";

import * as schema from "./schema";

config({ path: ".env.local" });

async function checkConnection() {
  const env = getEnvStatus();

  console.log("Environment variables:");
  console.log(`  DATABASE_URL (Supabase): ${env.database ? "set" : "MISSING"}`);
  console.log(`  SESSION_SECRET:          ${env.session ? "set" : "MISSING"}`);
  console.log(`  APP_URL:                 ${env.appUrl}`);
  console.log(`  GOOGLE_CLIENT_ID/SECRET: ${env.google ? "set" : "not set (Drive disabled until added)"}`);
  console.log(`  SEED_ADMIN_PASSWORD:     ${env.seed ? "set" : "not set (only needed for npm run db:seed)"}`);
  console.log("");

  const url = getDatabaseUrl();
  const usingPooler = url.includes("pooler.supabase.com");
  const client = postgres(url, { prepare: false, ssl: "require", max: 1 });
  const db = drizzle(client, { schema });

  const [{ version }] = await db.execute<{ version: string }>(
    sql`select version() as version`,
  );

  const tables = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `);

  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users);
  const [clientCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.clients);
  const [taskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.tasks);

  const admin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.username, "admin"),
    columns: { username: true, role: true, name: true },
  });

  console.log("Supabase connection: OK");
  console.log(`Connection mode: ${usingPooler ? "Transaction pooler (6543)" : "Direct (5432)"}`);
  console.log(`Postgres: ${version.split(",")[0]}`);
  console.log(
    `Tables (${tables.length}): ${tables.map((row) => row.table_name).join(", ")}`,
  );
  console.log(`Rows — users: ${userCount.count}, clients: ${clientCount.count}, tasks: ${taskCount.count}`);
  console.log(
    admin
      ? `Admin user: ${admin.username} (${admin.role}) — ${admin.name}`
      : "Admin user: not found — run npm run db:seed (requires SEED_ADMIN_PASSWORD)",
  );

  await client.end();
}

checkConnection().catch((error) => {
  console.error("Supabase connection: FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
