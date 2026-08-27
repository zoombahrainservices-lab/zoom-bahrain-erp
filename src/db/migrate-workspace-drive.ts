import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateWorkspaceDrive() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  await sql`
    CREATE TABLE IF NOT EXISTS "workspace_drive" (
      "id" text PRIMARY KEY,
      "connected_by_user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
      "access_token" text NOT NULL,
      "refresh_token" text,
      "expires_at" timestamptz,
      "google_email" text,
      "root_folder_id" text,
      "workspace_folder_id" text,
      "connected_at" timestamptz NOT NULL DEFAULT now()
    )
  `;

  const oldTable = await sql`
    SELECT to_regclass('public.google_connections') AS name
  `;

  if (oldTable[0]?.name) {
    await sql`
      INSERT INTO "workspace_drive" (
        "id",
        "connected_by_user_id",
        "access_token",
        "refresh_token",
        "expires_at",
        "google_email",
        "root_folder_id",
        "workspace_folder_id",
        "connected_at"
      )
      SELECT
        'workspace',
        "user_id",
        "access_token",
        "refresh_token",
        "expires_at",
        "google_email",
        "root_folder_id",
        "clients_folder_id",
        "connected_at"
      FROM "google_connections"
      LIMIT 1
      ON CONFLICT ("id") DO UPDATE SET
        "connected_by_user_id" = EXCLUDED."connected_by_user_id",
        "access_token" = EXCLUDED."access_token",
        "refresh_token" = EXCLUDED."refresh_token",
        "expires_at" = EXCLUDED."expires_at",
        "google_email" = EXCLUDED."google_email",
        "root_folder_id" = EXCLUDED."root_folder_id",
        "workspace_folder_id" = EXCLUDED."workspace_folder_id",
        "connected_at" = EXCLUDED."connected_at"
    `;

    await sql`DROP TABLE "google_connections"`;
    console.log("Migrated google_connections -> workspace_drive.");
  } else {
    console.log("No google_connections table - workspace_drive ready.");
  }

  await sql.end();
}

migrateWorkspaceDrive().catch((error) => {
  console.error(error);
  process.exit(1);
});
