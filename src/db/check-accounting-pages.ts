import { config } from "dotenv";
import { SignJWT } from "jose";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  const secret = process.env.SESSION_SECRET;
  if (!url || !secret) throw new Error("DATABASE_URL or SESSION_SECRET missing");
  const sql = postgres(url, { prepare: false, ssl: "require", max: 1, connect_timeout: 20 });
  const [user] = await sql<{ id: string; username: string; name: string; role: string }[]>`
    SELECT id, username, name, role FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1
  `;
  await sql.end();
  if (!user) throw new Error("No admin user");

  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));
  const cookie = `zoom-erp-session=${token}`;
  const base = "http://localhost:3000";
  const paths = [
    "/accounting",
    "/accounting/purchases",
    "/accounting/sales",
    "/accounting/banking",
    "/accounting/vat",
    "/accounting/reports",
    "/accounting/reports/profit-and-loss",
    "/accounting/analytics",
    "/accounting/payments",
    "/api/accounting/pdf?kind=report&report=profit-and-loss",
    "/api/accounting/export?kind=report&report=trial-balance",
  ];

  for (const path of paths) {
    const response = await fetch(`${base}${path}`, { headers: { cookie }, redirect: "manual" });
    const type = response.headers.get("content-type") ?? "";
    const body = type.includes("pdf") ? "" : await response.text();
    const failed = /Application error|column .* does not exist|Failed query/i.test(body);
    const heading = type.includes("pdf")
      ? `pdf ${body ? "" : response.headers.get("content-disposition") ?? ""}`
      : body.match(/Customer invoices|Supplier bill|Cash and bank|Bahrain VAT|Financial reports|Accrual results|Profit|Trial|Receive payment|Accounting/)?.[0]
        ?? body.slice(0, 60).replace(/\s+/g, " ");
    console.log(`${response.status} ${failed ? "ERROR" : "ok"} ${path} :: ${heading}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "check failed");
  process.exit(1);
});
