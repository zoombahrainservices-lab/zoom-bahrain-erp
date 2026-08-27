import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function migrateServicesToOperations() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const sql = postgres(url, { prepare: false, ssl: "require" });

  const hasServices = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'services'
    ) AS exists
  `;

  if (hasServices[0]?.exists) {
    await sql`ALTER TABLE "services" RENAME TO "operations"`;
    await sql`ALTER TABLE "operations" RENAME COLUMN "service_code" TO "operation_code"`;
    console.log("Renamed services → operations");
  }

  const hasServiceEntries = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'service_entries'
    ) AS exists
  `;

  if (hasServiceEntries[0]?.exists) {
    await sql`ALTER TABLE "service_entries" RENAME TO "operation_entries"`;
    await sql`ALTER TABLE "operation_entries" RENAME COLUMN "service_id" TO "operation_id"`;
    console.log("Renamed service_entries → operation_entries");
  }

  const hasServiceEntryColumn = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'drive_files'
        AND column_name = 'service_entry_id'
    ) AS exists
  `;

  if (hasServiceEntryColumn[0]?.exists) {
    await sql`ALTER TABLE "drive_files" RENAME COLUMN "service_entry_id" TO "operation_entry_id"`;
    console.log("Renamed drive_files.service_entry_id → operation_entry_id");
  }

  await sql`
    UPDATE code_sequences
    SET prefix = 'ZGC-OPS'
    WHERE prefix = 'ZGC-SVC'
  `;

  await sql`
    INSERT INTO code_sequences (prefix, next_value)
    VALUES ('ZGC-OPS', 1)
    ON CONFLICT (prefix) DO NOTHING
  `;

  await sql`
    UPDATE operations
    SET operation_code = REPLACE(operation_code, 'ZGC-SVC', 'ZGC-OPS')
    WHERE operation_code LIKE 'ZGC-SVC-%'
  `;

  await sql.end();
  console.log("Operations rename migration complete.");
}

migrateServicesToOperations().catch((error) => {
  console.error(error);
  process.exit(1);
});
