import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateUsername() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key"
  `;

  await sql`
    ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL
  `;

  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username")
  `;

  await sql.end();
  console.log("Username column migration applied.");
}

migrateUsername().catch((error) => {
  console.error(error);
  process.exit(1);
});
