import { getDivisionById } from "@/lib/divisions";
import { todayInputDate } from "@/lib/utils";

import { isIsoDate } from "./money";

export type AccountingFilter = {
  companyId: string;
  from: string;
  to: string;
  year: string;
  organizationId: string;
};

export function parseAccountingFilter(search: {
  company?: string | string[];
  from?: string | string[];
  to?: string | string[];
  year?: string | string[];
  organization?: string | string[];
}): AccountingFilter {
  const companyRaw = first(search.company);
  const fromRaw = first(search.from);
  const toRaw = first(search.to);
  const yearRaw = first(search.year);
  const today = todayInputDate();
  const currentYear = today.slice(0, 4);

  let from = `${currentYear}-01-01`;
  let to = today;
  let year = "";

  if (yearRaw && /^\d{4}$/.test(yearRaw)) {
    year = yearRaw;
    from = `${yearRaw}-01-01`;
    to = `${yearRaw}-12-31`;
  }

  if (fromRaw && isIsoDate(fromRaw)) from = fromRaw;
  if (toRaw && isIsoDate(toRaw)) to = toRaw;
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  const companyId =
    companyRaw === "all" || (companyRaw && getDivisionById(companyRaw))
      ? companyRaw
      : "all";

  return { companyId, from, to, year, organizationId: first(search.organization) };
}

export function filterQuery(filter: AccountingFilter, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (filter.companyId !== "all") params.set("company", filter.companyId);
  params.set("from", filter.from);
  params.set("to", filter.to);
  if (filter.year) params.set("year", filter.year);
  if (filter.organizationId) params.set("organization", filter.organizationId);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return params.toString();
}

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
