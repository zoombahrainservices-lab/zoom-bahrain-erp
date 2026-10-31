import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accountingAccounts,
  accountingBankAccounts,
  accountingJournals,
  accountingPayments,
  accountingPeriods,
  accountingSettings,
  accountingVatCodes,
  operationEntries,
  organizations,
} from "@/db/schema";
import { divisions, getDivisionName } from "@/lib/divisions";

import { amountInBhd, eliminateIntercompany } from "./consolidate";
import type { AccountingFilter } from "./filters";
import { prepareAccounting } from "./engine";
import { addHomeAmount, blankHomeMonths, monthsBetween, type HomeMonth } from "./home-series";
import { filsToAmount, toFils } from "./money";

export type CompanySnapshot = {
  companyId: string;
  companyName: string;
  currency: string;
  cash: bigint;
  bank: bigint;
  receivables: bigint;
  payables: bigint;
  sales: bigint;
  purchases: bigint;
  expenses: bigint;
  profit: bigint;
};

type MovementRow = {
  company_id: string;
  account_type: string;
  subtype: string;
  debit: string;
  credit: string;
};

export async function getDashboard(filter: AccountingFilter) {
  await prepareAccounting(filter.companyId);
  const [cumulative, period, overdue, recent, currencies] = await Promise.all([
    loadTypeMovements(filter, "asof"),
    loadTypeMovements(filter, "period"),
    listOverdueInvoices(filter),
    listRecentJournals(filter),
    listCurrencies(filter),
  ]);

  const companyIds =
    filter.companyId === "all"
      ? divisions.map((division) => division.id)
      : [filter.companyId];

  const companies = companyIds.map((companyId) =>
    snapshotFor(companyId, cumulative, period, currencies),
  );
  const rates = filter.companyId === "all" ? await ratesToBhd(filter.to) : new Map<string, string>();
  const missingRates: string[] = [];
  const converted =
    filter.companyId === "all"
      ? companies.flatMap((company) => {
          const rate = company.currency === "BHD" ? "1.000" : rates.get(`${company.companyId}:${company.currency}`) ?? null;
          const cash = amountInBhd(company.cash, company.currency, rate);
          if (cash === null) {
            missingRates.push(`${company.companyName} (${company.currency})`);
            return [];
          }
          return [{
            ...company,
            currency: "BHD",
            cash,
            bank: amountInBhd(company.bank, company.currency, rate) ?? 0n,
            receivables: amountInBhd(company.receivables, company.currency, rate) ?? 0n,
            payables: amountInBhd(company.payables, company.currency, rate) ?? 0n,
            sales: amountInBhd(company.sales, company.currency, rate) ?? 0n,
            purchases: amountInBhd(company.purchases, company.currency, rate) ?? 0n,
            expenses: amountInBhd(company.expenses, company.currency, rate) ?? 0n,
            profit: amountInBhd(company.profit, company.currency, rate) ?? 0n,
          }];
        })
      : companies;

  const included = filter.companyId === "all" ? converted : companies;
  return {
    companies,
    totals: sumSnapshots(included),
    includedCompanyIds: included.map((company) => company.companyId),
    missingRates,
    overdue,
    recent,
  };
}

export async function getHomeTrends(
  filter: AccountingFilter,
  includedCompanyIds: string[],
): Promise<{ months: HomeMonth[]; truncated: boolean }> {
  await prepareAccounting(filter.companyId);
  const company =
    filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const range = monthsBetween(filter.from, filter.to);
  const months = blankHomeMonths(range.months);
  const [activity, flow, currencies] = await Promise.all([
    db.execute<{ company_id: string; month: string; sales: string; purchases: string }>(sql`
      SELECT j.company_id,
             to_char(j.entry_date, 'YYYY-MM') AS month,
             COALESCE(SUM(CASE WHEN a.subtype = 'sales' THEN l.credit - l.debit ELSE 0 END), 0)::text AS sales,
             COALESCE(SUM(CASE WHEN a.subtype = 'purchases' THEN l.debit - l.credit ELSE 0 END), 0)::text AS purchases
      FROM accounting_journal_lines l
      INNER JOIN accounting_journals j ON j.id = l.journal_id
      INNER JOIN accounting_accounts a ON a.id = l.account_id
      WHERE j.status = 'posted'
        AND j.entry_date >= ${filter.from}::date
        AND j.entry_date <= ${filter.to}::date
        ${company}
      GROUP BY j.company_id, to_char(j.entry_date, 'YYYY-MM')
    `),
    db.execute<{ company_id: string; month: string; money_in: string; money_out: string }>(sql`
      SELECT j.company_id,
             to_char(j.entry_date, 'YYYY-MM') AS month,
             COALESCE(SUM(l.debit), 0)::text AS money_in,
             COALESCE(SUM(l.credit), 0)::text AS money_out
      FROM accounting_journal_lines l
      INNER JOIN accounting_journals j ON j.id = l.journal_id
      INNER JOIN accounting_accounts a ON a.id = l.account_id
      WHERE j.status = 'posted'
        AND a.subtype IN ('cash', 'bank')
        AND j.source_type <> 'bank_transfer'
        AND NOT EXISTS (
          SELECT 1 FROM accounting_journals original
          WHERE original.id = j.reversal_of_id
            AND original.source_type = 'bank_transfer'
        )
        AND j.entry_date >= ${filter.from}::date
        AND j.entry_date <= ${filter.to}::date
        ${company}
      GROUP BY j.company_id, to_char(j.entry_date, 'YYYY-MM')
    `),
    listCurrencies(filter),
  ]);

  const rates = filter.companyId === "all" ? await ratesToBhd(filter.to) : null;
  const included = new Set(includedCompanyIds);
  const convert = (companyId: string, amount: bigint) => {
    if (!included.has(companyId)) return null;
    if (!rates) return amount;
    const currency = currencies.get(companyId) ?? "BHD";
    const rate = currency === "BHD" ? "1.000" : rates.get(`${companyId}:${currency}`) ?? null;
    return amountInBhd(amount, currency, rate);
  };

  for (const row of rowsOf<{ company_id: string; month: string; sales: string; purchases: string }>(activity)) {
    addHomeAmount(months, row.month, "sales", convert(row.company_id, toFils(row.sales)));
    addHomeAmount(months, row.month, "purchases", convert(row.company_id, toFils(row.purchases)));
  }
  for (const row of rowsOf<{ company_id: string; month: string; money_in: string; money_out: string }>(flow)) {
    addHomeAmount(months, row.month, "moneyIn", convert(row.company_id, toFils(row.money_in)));
    addHomeAmount(months, row.month, "moneyOut", convert(row.company_id, toFils(row.money_out)));
  }
  return { months, truncated: range.truncated };
}

export async function listAccounts(companyId: string) {
  await prepareAccounting(companyId);
  return db.query.accountingAccounts.findMany({
    where:
      companyId === "all"
        ? undefined
        : eq(accountingAccounts.companyId, companyId),
    orderBy: [accountingAccounts.companyId, accountingAccounts.code],
  });
}

export async function listPeriods(companyId: string) {
  await prepareAccounting(companyId);
  return db.query.accountingPeriods.findMany({
    where:
      companyId === "all"
        ? undefined
        : eq(accountingPeriods.companyId, companyId),
    orderBy: [desc(accountingPeriods.startsOn)],
  });
}

export async function listVatCodes(companyId: string) {
  await prepareAccounting(companyId);
  return db.query.accountingVatCodes.findMany({
    where:
      companyId === "all"
        ? undefined
        : eq(accountingVatCodes.companyId, companyId),
    orderBy: [accountingVatCodes.companyId, accountingVatCodes.code],
  });
}

export async function listBankAccounts(companyId: string) {
  await prepareAccounting(companyId);
  return db.query.accountingBankAccounts.findMany({
    where:
      companyId === "all"
        ? undefined
        : eq(accountingBankAccounts.companyId, companyId),
    with: { account: true },
    orderBy: [accountingBankAccounts.companyId, accountingBankAccounts.name],
  });
}

export async function listJournals(filter: AccountingFilter) {
  await prepareAccounting(filter.companyId);
  const rows = await db.query.accountingJournals.findMany({
    where: and(
      filter.companyId === "all"
        ? undefined
        : eq(accountingJournals.companyId, filter.companyId),
      sql`${accountingJournals.entryDate} >= ${filter.from}`,
      sql`${accountingJournals.entryDate} <= ${filter.to}`,
    ),
    with: { lines: { with: { account: true } } },
    orderBy: [desc(accountingJournals.entryDate), desc(accountingJournals.journalNumber)],
    limit: 200,
  });
  return rows;
}

export async function getJournal(id: string) {
  return db.query.accountingJournals.findFirst({
    where: eq(accountingJournals.id, id),
    with: {
      lines: { with: { account: true, organization: true } },
      organization: true,
    },
  });
}

export async function listPayments(filter: AccountingFilter) {
  await prepareAccounting(filter.companyId);
  return db.query.accountingPayments.findMany({
    where: and(
      filter.companyId === "all"
        ? undefined
        : eq(accountingPayments.companyId, filter.companyId),
      sql`${accountingPayments.paidOn} >= ${filter.from}`,
      sql`${accountingPayments.paidOn} <= ${filter.to}`,
    ),
    with: { organization: true, journal: true },
    orderBy: [desc(accountingPayments.paidOn)],
    limit: 200,
  });
}

export async function getPayment(id: string) {
  return db.query.accountingPayments.findFirst({
    where: eq(accountingPayments.id, id),
    with: { organization: true, journal: { with: { lines: { with: { account: true } } } } },
  });
}

export async function listOrganizations() {
  return db.query.organizations.findMany({
    columns: { id: true, name: true, orgCode: true },
    orderBy: [organizations.name],
  });
}

export async function listCommercialForAccounting(
  entryType: "invoice" | "procurement" | "cost",
  filter: AccountingFilter,
) {
  await prepareAccounting(filter.companyId);
  const rows = await db.query.operationEntries.findMany({
    where: eq(operationEntries.entryType, entryType),
    with: {
      operation: {
        columns: {
          id: true,
          operationCode: true,
          title: true,
          divisionId: true,
          organizationId: true,
          contactId: true,
        },
        with: {
          organization: { columns: { id: true, name: true } },
          contact: { columns: { id: true, name: true } },
        },
      },
      vendorOrganization: { columns: { id: true, name: true } },
    },
    orderBy: [desc(operationEntries.activityDate)],
    limit: 300,
  });

  const filtered = rows.filter((row) => {
    if (!row.operation) return false;
    if (filter.companyId !== "all" && row.operation.divisionId !== filter.companyId) {
      return false;
    }
    const date = formatLedgerDate(row.activityDate);
    return date >= filter.from && date <= filter.to;
  });

  const balances = await documentBalances(filtered.map((row) => row.id));
  const journals = await sourceJournals(
    filtered.map((row) => row.id),
    entryType === "cost" ? "operation_cost" : entryType,
  );

  return filtered.map((row) => ({
    ...row,
    ledgerDate: formatLedgerDate(row.activityDate),
    outstanding: balances.get(row.id) ?? 0n,
    journal: journals.get(row.id) ?? null,
  }));
}

export async function accountTotals(filter: AccountingFilter, scope: "asof" | "period") {
  await prepareAccounting(filter.companyId);
  const company =
    filter.companyId === "all" ? sql`` : sql`AND a.company_id = ${filter.companyId}`;
  const dateClause =
    scope === "period"
      ? sql`AND j.entry_date >= ${filter.from}::date AND j.entry_date <= ${filter.to}::date`
      : sql`AND j.entry_date <= ${filter.to}::date`;

  const rows = await db.execute<{
    id: string;
    company_id: string;
    code: string;
    name: string;
    account_type: string;
    subtype: string | null;
    normal_balance: string;
    debit: string;
    credit: string;
  }>(sql`
    SELECT
      a.id,
      a.company_id,
      a.code,
      a.name,
      a.account_type,
      a.subtype,
      a.normal_balance,
      COALESCE(SUM(posted.debit), 0)::text AS debit,
      COALESCE(SUM(posted.credit), 0)::text AS credit
    FROM accounting_accounts a
    LEFT JOIN (
      SELECT l.account_id, l.debit, l.credit
      FROM accounting_journal_lines l
      INNER JOIN accounting_journals j ON j.id = l.journal_id
      WHERE j.status = 'posted'
        ${dateClause}
    ) posted ON posted.account_id = a.id
    WHERE 1 = 1
      ${company}
    GROUP BY a.id, a.company_id, a.code, a.name, a.account_type, a.subtype, a.normal_balance
    ORDER BY a.company_id, a.code
  `);

  const listed = rowsOf<{
    id: string;
    company_id: string;
    code: string;
    name: string;
    account_type: string;
    subtype: string | null;
    normal_balance: string;
    debit: string;
    credit: string;
  }>(rows);

  const mapped = listed.map((row) => ({
    id: row.id,
    company_id: row.company_id,
    code: row.code,
    name: row.name,
    account_type: row.account_type,
    subtype: row.subtype,
    normal_balance: row.normal_balance,
    debit: row.debit,
    credit: row.credit,
    debitFils: toFils(row.debit),
    creditFils: toFils(row.credit),
    companyName: getDivisionName(row.company_id),
  }));
  if (filter.companyId !== "all") return mapped;

  const [rates, currencies] = await Promise.all([
    ratesToBhd(filter.to),
    listCurrencies(filter),
  ]);
  const converted = mapped.flatMap((row) => {
    const currency = currencies.get(row.company_id) ?? "BHD";
    const rate = currency === "BHD" ? "1.000" : rates.get(`${row.company_id}:${currency}`) ?? null;
    const debitFils = amountInBhd(row.debitFils, currency, rate);
    const creditFils = amountInBhd(row.creditFils, currency, rate);
    if (debitFils === null || creditFils === null) return [];
    return [{
      ...row,
      debitFils,
      creditFils,
      debit: filsToAmount(debitFils),
      credit: filsToAmount(creditFils),
    }];
  });
  return eliminateIntercompany(converted);
}

export async function ratesToBhd(on: string) {
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (company_id, currency)
      company_id,
      currency,
      rate_to_bhd
    FROM accounting_exchange_rates
    WHERE effective_on <= ${on}::date
    ORDER BY company_id, currency, effective_on DESC
  `);
  const rates = new Map<string, string>();
  for (const row of rowsOf<{ company_id: string; currency: string; rate_to_bhd: string }>(rows)) {
    rates.set(`${row.company_id}:${row.currency}`, row.rate_to_bhd);
  }
  return rates;
}

export async function generalLedger(filter: AccountingFilter, accountId?: string) {
  await prepareAccounting(filter.companyId);
  const company =
    filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const account = accountId ? sql`AND a.id = ${accountId}` : sql``;

  const openings = await db.execute<{
    account_id: string;
    debit: string;
    credit: string;
  }>(sql`
    SELECT a.id AS account_id,
      COALESCE(SUM(l.debit), 0)::text AS debit,
      COALESCE(SUM(l.credit), 0)::text AS credit
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted'
      AND j.entry_date < ${filter.from}::date
      ${company}
      ${account}
    GROUP BY a.id
  `);

  const lines = await db.execute<{
    journal_id: string;
    journal_number: string;
    entry_date: string;
    journal_description: string;
    company_id: string;
    account_id: string;
    code: string;
    name: string;
    line_description: string;
    debit: string;
    credit: string;
  }>(sql`
    SELECT
      j.id AS journal_id,
      j.journal_number,
      j.entry_date::text AS entry_date,
      j.description AS journal_description,
      j.company_id,
      a.id AS account_id,
      a.code,
      a.name,
      l.description AS line_description,
      l.debit::text AS debit,
      l.credit::text AS credit
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted'
      AND j.entry_date >= ${filter.from}::date
      AND j.entry_date <= ${filter.to}::date
      ${company}
      ${account}
    ORDER BY a.code, j.entry_date, j.journal_number, l.sort_order
  `);

  return {
    openings: new Map(
      rowsOf(openings).map((row) => [
        row.account_id,
        toFils(row.debit) - toFils(row.credit),
      ]),
    ),
    lines: rowsOf(lines),
  };
}

export async function partyBalances(
  filter: AccountingFilter,
  subtype: "receivable" | "payable",
) {
  await prepareAccounting(filter.companyId);
  const company =
    filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const net =
    subtype === "receivable"
      ? sql`SUM(l.debit - l.credit)`
      : sql`SUM(l.credit - l.debit)`;

  const rows = await db.execute<{
    organization_id: string | null;
    contact_id: string | null;
    company_id: string;
    name: string | null;
    balance: string;
  }>(sql`
    SELECT
      l.organization_id,
      l.contact_id,
      j.company_id,
      COALESCE(o.name, c.name, 'Unassigned') AS name,
      COALESCE(${net}, 0)::text AS balance
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    LEFT JOIN organizations o ON o.id = l.organization_id
    LEFT JOIN organization_contacts c ON c.id = l.contact_id
    WHERE j.status = 'posted'
      AND j.entry_date <= ${filter.to}::date
      AND a.subtype = ${subtype}
      ${company}
    GROUP BY l.organization_id, l.contact_id, j.company_id, o.name, c.name
    HAVING COALESCE(${net}, 0) <> 0
    ORDER BY name
  `);

  return rowsOf(rows).map((row) => ({
    ...row,
    balanceFils: toFils(row.balance),
    companyName: getDivisionName(row.company_id),
  }));
}

export async function partyLedger(input: {
  filter: AccountingFilter;
  organizationId?: string;
  contactId?: string;
}) {
  await prepareAccounting(input.filter.companyId);
  if (!input.organizationId && !input.contactId) return [];
  const party = input.organizationId
    ? sql`l.organization_id = ${input.organizationId}`
    : sql`l.contact_id = ${input.contactId}`;
  const company =
    input.filter.companyId === "all"
      ? sql``
      : sql`AND j.company_id = ${input.filter.companyId}`;

  const rows = await db.execute<{
    journal_id: string;
    journal_number: string;
    entry_date: string;
    description: string;
    company_id: string;
    source_type: string;
    code: string;
    account_name: string;
    debit: string;
    credit: string;
    subtype: string | null;
  }>(sql`
    SELECT
      j.id AS journal_id,
      j.journal_number,
      j.entry_date::text AS entry_date,
      COALESCE(NULLIF(l.description, ''), j.description) AS description,
      j.company_id,
      j.source_type,
      a.code,
      a.name AS account_name,
      l.debit::text AS debit,
      l.credit::text AS credit,
      a.subtype
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted'
      AND j.entry_date <= ${input.filter.to}::date
      AND ${party}
      ${company}
    ORDER BY j.entry_date, j.journal_number, l.sort_order
  `);

  return rowsOf(rows);
}

export async function vatMovements(filter: AccountingFilter) {
  const totals = await accountTotals(filter, "period");
  return totals.filter(
    (row) => row.subtype === "vat_input" || row.subtype === "vat_output",
  );
}

export async function bankActivity(filter: AccountingFilter, accountId?: string) {
  await prepareAccounting(filter.companyId);
  const company =
    filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const accountClause = accountId
    ? sql`AND a.id = ${accountId}`
    : sql`AND a.subtype IN ('cash', 'bank')`;
  const rows = await db.execute<{
    journal_id: string;
    journal_number: string;
    entry_date: string;
    description: string;
    line_description: string;
    source_type: string;
    party_name: string | null;
    company_id: string;
    code: string;
    account_name: string;
    debit: string;
    credit: string;
  }>(sql`
    SELECT
      j.id AS journal_id,
      j.journal_number,
      j.entry_date::text AS entry_date,
      COALESCE(NULLIF(l.description, ''), j.description) AS description,
      l.description AS line_description,
      j.source_type,
      COALESCE(party_org.name, NULLIF(party_contact.name, ''), NULLIF(party_contact.contact_code, '')) AS party_name,
      j.company_id,
      a.code,
      a.name AS account_name,
      l.debit::text AS debit,
      l.credit::text AS credit
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    LEFT JOIN organizations party_org ON party_org.id = COALESCE(l.organization_id, j.organization_id)
    LEFT JOIN organization_contacts party_contact ON party_contact.id = COALESCE(l.contact_id, j.contact_id)
    WHERE j.status = 'posted'
      AND j.entry_date >= ${filter.from}::date
      AND j.entry_date <= ${filter.to}::date
      ${accountClause}
      ${company}
    ORDER BY j.entry_date DESC, j.journal_number DESC
    LIMIT 200
  `);
  return rowsOf(rows);
}

async function loadTypeMovements(filter: AccountingFilter, scope: "asof" | "period") {
  const company =
    filter.companyId === "all" ? sql`` : sql`AND j.company_id = ${filter.companyId}`;
  const dates =
    scope === "period"
      ? sql`AND j.entry_date >= ${filter.from}::date AND j.entry_date <= ${filter.to}::date`
      : sql`AND j.entry_date <= ${filter.to}::date`;

  const rows = await db.execute<MovementRow>(sql`
    SELECT
      j.company_id,
      a.account_type,
      COALESCE(a.subtype, '') AS subtype,
      COALESCE(SUM(l.debit), 0)::text AS debit,
      COALESCE(SUM(l.credit), 0)::text AS credit
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted'
      ${dates}
      ${company}
    GROUP BY j.company_id, a.account_type, a.subtype
  `);
  return rowsOf(rows);
}

async function listOverdueInvoices(filter: AccountingFilter) {
  const rows = await db.query.operationEntries.findMany({
    where: and(
      eq(operationEntries.entryType, "invoice"),
      eq(operationEntries.documentStage, "overdue"),
    ),
    with: {
      operation: {
        columns: { id: true, operationCode: true, divisionId: true, title: true },
        with: { organization: { columns: { name: true } } },
      },
    },
    limit: 50,
  });
  return rows.filter(
    (row) =>
      row.operation &&
      (filter.companyId === "all" || row.operation.divisionId === filter.companyId),
  );
}

async function listRecentJournals(filter: AccountingFilter) {
  return db.query.accountingJournals.findMany({
    where: and(
      eq(accountingJournals.status, "posted"),
      filter.companyId === "all"
        ? undefined
        : eq(accountingJournals.companyId, filter.companyId),
      sql`${accountingJournals.entryDate} >= ${filter.from}`,
      sql`${accountingJournals.entryDate} <= ${filter.to}`,
    ),
    orderBy: [desc(accountingJournals.postedAt)],
    limit: 8,
  });
}

async function listCurrencies(filter: AccountingFilter) {
  const rows = await db.query.accountingSettings.findMany({
    where:
      filter.companyId === "all"
        ? undefined
        : eq(accountingSettings.companyId, filter.companyId),
  });
  return new Map(rows.map((row) => [row.companyId, row.currency]));
}

function snapshotFor(
  companyId: string,
  cumulative: MovementRow[],
  period: MovementRow[],
  currencies: Map<string, string>,
): CompanySnapshot {
  const asOf = cumulative.filter((row) => row.company_id === companyId);
  const inPeriod = period.filter((row) => row.company_id === companyId);
  const sales = sumType(inPeriod, "income");
  const expenses = sumType(inPeriod, "expense");
  return {
    companyId,
    companyName: getDivisionName(companyId),
    currency: currencies.get(companyId) ?? "BHD",
    cash: sumSubtype(asOf, "cash", "debit"),
    bank: sumSubtype(asOf, "bank", "debit"),
    receivables: sumSubtype(asOf, "receivable", "debit"),
    payables: sumSubtype(asOf, "payable", "credit"),
    sales: sumSubtype(inPeriod, "sales", "credit"),
    purchases: sumSubtype(inPeriod, "purchases", "debit"),
    expenses,
    profit: sales - expenses,
  };
}

function sumSnapshots(rows: CompanySnapshot[]): CompanySnapshot {
  return rows.reduce(
    (total, row) => ({
      companyId: "all",
      companyName: "Consolidated in BHD",
      currency: "BHD",
      cash: total.cash + row.cash,
      bank: total.bank + row.bank,
      receivables: total.receivables + row.receivables,
      payables: total.payables + row.payables,
      sales: total.sales + row.sales,
      purchases: total.purchases + row.purchases,
      expenses: total.expenses + row.expenses,
      profit: total.profit + row.profit,
    }),
    {
      companyId: "all",
      companyName: "Consolidated in BHD",
      currency: "BHD",
      cash: 0n,
      bank: 0n,
      receivables: 0n,
      payables: 0n,
      sales: 0n,
      purchases: 0n,
      expenses: 0n,
      profit: 0n,
    },
  );
}

function sumSubtype(
  rows: MovementRow[],
  subtype: string,
  normal: "debit" | "credit",
) {
  let debit = 0n;
  let credit = 0n;
  for (const row of rows) {
    if (row.subtype !== subtype) continue;
    debit += toFils(row.debit);
    credit += toFils(row.credit);
  }
  return normal === "debit" ? debit - credit : credit - debit;
}

function sumType(rows: MovementRow[], accountType: string) {
  let debit = 0n;
  let credit = 0n;
  for (const row of rows) {
    if (row.account_type !== accountType) continue;
    debit += toFils(row.debit);
    credit += toFils(row.credit);
  }
  if (accountType === "income") return credit - debit;
  return debit - credit;
}

async function documentBalances(entryIds: string[]) {
  const map = new Map<string, bigint>();
  if (entryIds.length === 0) return map;
  const rows = await db.execute<{
    operation_entry_id: string;
    subtype: string;
    net: string;
  }>(sql`
    SELECT j.operation_entry_id, a.subtype, COALESCE(SUM(l.debit - l.credit), 0)::text AS net
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted'
      AND j.operation_entry_id IN (${sql.join(entryIds.map((id) => sql`${id}`), sql`, `)})
      AND a.subtype IN ('receivable', 'payable')
    GROUP BY j.operation_entry_id, a.subtype
  `);
  for (const row of rowsOf(rows)) {
    const net = toFils(row.net);
    const balance = row.subtype === "payable" ? -net : net;
    map.set(row.operation_entry_id, (map.get(row.operation_entry_id) ?? 0n) + balance);
  }
  return map;
}

async function sourceJournals(entryIds: string[], sourceType: string) {
  const map = new Map<string, { id: string; journalNumber: string; reversed: boolean }>();
  if (entryIds.length === 0) return map;
  const rows = await db.query.accountingJournals.findMany({
    where: and(
      eq(accountingJournals.sourceType, sourceType),
      eq(accountingJournals.status, "posted"),
      sql`${accountingJournals.sourceId} IN (${sql.join(entryIds.map((id) => sql`${id}`), sql`, `)})`,
    ),
  });
  for (const row of rows) {
    if (!row.sourceId || row.reversalOfId) continue;
    map.set(row.sourceId, {
      id: row.id,
      journalNumber: row.journalNumber,
      reversed: Boolean(row.reversedById),
    });
  }
  return map;
}

function formatLedgerDate(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rowsOf<T = any>(rows: unknown): T[] {
  if (Array.isArray(rows)) return rows as T[];
  if (rows && typeof rows === "object" && "rows" in rows) {
    const nested = (rows as { rows?: unknown }).rows;
    return Array.isArray(nested) ? (nested as T[]) : [];
  }
  return [];
}

export function amountText(fils: bigint) {
  return filsToAmount(fils);
}
