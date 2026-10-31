import { redirect } from "next/navigation";

import { parseAccountingFilter, type AccountingFilter } from "@/lib/accounting/filters";
import { divisions } from "@/lib/divisions";
import { allowedCompanyIds } from "@/lib/accounting/phase3";
import { canManageAccountingSettings, canPostJournals, canViewAccounting } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export async function loadAccountingPage(search: {
  company?: string | string[];
  from?: string | string[];
  to?: string | string[];
  year?: string | string[];
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewAccounting(session)) redirect("/dashboard");

  const filter: AccountingFilter = parseAccountingFilter(search);
  const allowed = await allowedCompanyIds(session.userId, session.role);
  const companies = divisions
    .filter((division) => allowed === "all" || allowed.includes(division.id))
    .map((division) => ({ id: division.id, name: division.name }));
  if (companies.length === 0) redirect("/dashboard");
  if (allowed !== "all" && (filter.companyId === "all" || !allowed.includes(filter.companyId))) {
    filter.companyId = companies[0].id;
  }
  return {
    session,
    filter,
    companies,
    canPost: canPostJournals(session),
    canManageSettings: canManageAccountingSettings(session),
  };
}

/** Same company grants as the accounting pages, without sending a denied user back to Home. */
export async function loadHomeContext(search: {
  company?: string | string[];
  from?: string | string[];
  to?: string | string[];
  year?: string | string[];
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewAccounting(session)) return { status: "unavailable" as const };
  const filter: AccountingFilter = parseAccountingFilter(search);
  const allowed = await allowedCompanyIds(session.userId, session.role);
  const companies = divisions
    .filter((division) => allowed === "all" || allowed.includes(division.id))
    .map((division) => ({ id: division.id, name: division.name }));
  if (companies.length === 0) return { status: "no-company" as const };
  if (allowed !== "all" && (filter.companyId === "all" || !allowed.includes(filter.companyId))) {
    filter.companyId = companies[0].id;
  }
  return { status: "ready" as const, filter, companies };
}
