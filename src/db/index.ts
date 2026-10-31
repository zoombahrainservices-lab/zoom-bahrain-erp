import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseUrl } from "@/lib/env";

import * as schema from "./schema";

const databaseUrl = getDatabaseUrl();
const databaseHost = (() => {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return "";
  }
})();

const client = postgres(databaseUrl, {
  prepare: false,
  ssl: databaseHost === "localhost" || databaseHost === "127.0.0.1" ? false : "require",
});

export const db = drizzle(client, { schema });

export function closeDatabase() {
  return client.end({ timeout: 5 });
}
