import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function clearForMigration() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    TRUNCATE TABLE
      drive_files,
      tasks,
      google_connections,
      clients,
      users
    RESTART IDENTITY CASCADE
  `;

  await sql.end();
  console.log("Database cleared for schema migration.");
}

clearForMigration().catch((error) => {
  console.error(error);
  process.exit(1);
});
