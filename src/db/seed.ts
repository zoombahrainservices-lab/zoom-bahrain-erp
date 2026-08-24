import { config } from "dotenv";

import { resetToAdminUser } from "@/lib/auth";
import { getSeedAdminUsername } from "@/lib/env";

config({ path: ".env.local" });

async function seed() {
  await resetToAdminUser();
  console.log("Seed complete.");
  console.log(`Login with username: ${getSeedAdminUsername()}`);
  console.log("Password: value from SEED_ADMIN_PASSWORD in .env.local");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
