import { desc, eq } from "drizzle-orm";

import { GrantForm, IntercompanyForm, PayrollForm, ReminderRunForm, DeliverButton } from "@/components/accounting/control-forms";
import { StockSubledger } from "@/components/accounting/stock-subledger";
import { Panel } from "@/components/accounting/ui";
import { db } from "@/db";
import { accountingEmails, accountingIntercompany, accountingItems, accountingPayrollRuns } from "@/db/schema";
import { loadAccountingPage } from "@/lib/accounting/page";
import { diagnoseHistoricalOverlaps } from "@/lib/accounting/overlap-diagnostic";
import { LEGACY_STOCK_RETIREMENT } from "@/lib/stock/legacy";
import { loadStockSubledger } from "@/lib/stock/read";

export default async function ControlPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const companyId = page.filter.companyId;
  const [emails, items, payroll, intercompany, subledger, overlap] = await Promise.all([
    db.query.accountingEmails.findMany({ orderBy: [desc(accountingEmails.createdAt)], limit: 20 }),
    db.query.accountingItems.findMany({
      where: companyId === "all" ? undefined : eq(accountingItems.companyId, companyId),
      limit: 30,
    }),
    db.query.accountingPayrollRuns.findMany({
      where: companyId === "all" ? undefined : eq(accountingPayrollRuns.companyId, companyId),
      orderBy: [desc(accountingPayrollRuns.createdAt)],
      limit: 20,
    }),
    db.query.accountingIntercompany.findMany({
      orderBy: [desc(accountingIntercompany.createdAt)],
      limit: 20,
    }),
    loadStockSubledger(companyId),
    diagnoseHistoricalOverlaps(companyId).catch((error: unknown) => ({
      confirmed: [],
      suspected: [],
      note: error instanceof Error ? error.message : "The overlap review could not be read.",
    })),
  ]);
  return (
    <div className="space-y-6">
      <Panel title="Payment reminders">
        <p className="mb-3 text-sm text-text-secondary">
          Defaults are 3 days before, the due date, then 7, 14, and 30 days after. A queued email is not a delivered email. Delivery is stored only after the provider accepts it. Leave delivery off unless an authorised provider is configured. This button does not send mail when delivery is unchecked.
        </p>
        {page.canPost ? <ReminderRunForm /> : null}
        <ul className="mt-4 space-y-2 text-sm">
          {emails.map((email) => (
            <li key={email.id} className="rounded-lg bg-surface p-3 ring-1 ring-border">
              <p className="font-medium text-heading">{email.subject}</p>
              <p className="text-text-secondary">{email.toAddress} · {email.status} · {email.lastError}</p>
              <p className="mt-1 whitespace-pre-wrap text-foreground">{email.body}</p>
              {page.canPost && email.status !== "sent" ? <div className="mt-2"><DeliverButton id={email.id} /></div> : null}
            </li>
          ))}
          {emails.length === 0 ? <li className="text-text-secondary">No reminder emails have been queued.</li> : null}
        </ul>
      </Panel>
      {page.canPost ? (
        <Panel title="Intercompany">
          <p className="mb-3 text-sm text-text-secondary">
            Each company keeps its own books. An expense paid by one company for another debits due-from in the paying company and the expense plus due-to in the other company. The group total of these balances is not a consolidated statement until you eliminate them.
          </p>
          <IntercompanyForm companies={page.companies} />
          <ul className="mt-3 space-y-1 text-sm text-foreground">
            {intercompany.map((row) => (
              <li key={row.id}>{row.entryDate} · {row.kind} · {row.amount} · {row.description}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <Panel title="Overlap review">
        <p className="mb-3 text-sm text-text-secondary">{overlap.note}</p>
        <ul className="space-y-2 text-sm text-foreground">
          {overlap.confirmed.map((row) => (
            <li key={`c-${row.detail}`}>Confirmed · {row.detail}</li>
          ))}
          {overlap.suspected.map((row) => (
            <li key={`s-${row.detail}`}>Review · {row.detail}</li>
          ))}
          {overlap.confirmed.length === 0 && overlap.suspected.length === 0 ? (
            <li className="text-text-secondary">No confirmed duplicate journals in this company.</li>
          ) : null}
        </ul>
      </Panel>
      <Panel title="Legacy accounting stock">
        <p className="mb-3 text-sm text-text-secondary">
          These quantities and average costs are the existing accounting item balances. They are not replaced by the new subledger. {LEGACY_STOCK_RETIREMENT}{" "}
          <a href="/inventory" className="font-medium text-heading">Open Inventory and choose Adjustment</a>
        </p>
        <ul className="mt-3 space-y-1 text-sm text-foreground">
          {items.map((item) => (
            <li key={item.id}>{item.sku} · {item.name} · {item.ownership} · qty {item.quantity} · average {item.averageCost}</li>
          ))}
          {items.length === 0 ? <li className="text-text-secondary">No legacy accounting stock for this company.</li> : null}
        </ul>
      </Panel>
      <StockSubledger rows={subledger} />
      {page.canPost ? (
        <Panel title="Payroll summary">
          <p className="mb-3 text-sm text-text-secondary">
            Enter the contributory wage, the scheme, and the years of service. Zoom calculates the employee deduction, the employer insurance, and end-of-service, then posts salaries, net pay, and the amount payable to SIO or GOSI. Bahraini SIO follows the yearly employer rate in force on the pay date. Non-Bahraini end-of-service is 4.2% for the first three years and 8.4% after that. Saudi GOSI uses the existing or new registration, and non-Saudi end-of-service accrues half a month a year for the first five years and one month a year after that.
          </p>
          <PayrollForm companies={page.companies} />
          <ul className="mt-3 space-y-1 text-sm text-foreground">
            {payroll.map((run) => (
              <li key={run.id}>{run.periodLabel} · {run.status} · gross {run.gross} · net {run.netPay}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {page.canManageSettings ? (
        <Panel title="Company access">
          <p className="mb-3 text-sm text-text-secondary">
            Staff with no grant can still open every company, which is the existing rule. Once a user has a grant, accounting pages and new postings are limited to those companies. Role names are labels. Posting still requires an administrator.
          </p>
          <GrantForm companies={page.companies} />
        </Panel>
      ) : null}
    </div>
  );
}
