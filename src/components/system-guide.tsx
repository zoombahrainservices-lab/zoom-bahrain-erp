import type { ReactNode } from "react";

import { Heading } from "@/components/catalyst/heading";
import { Link } from "@/components/catalyst/link";
import { Text } from "@/components/catalyst/text";
import { divisions } from "@/lib/divisions";
import {
  activityTypeGroups,
  defaultOperationActivityTypes,
} from "@/lib/operation-activity-types";
import { workDeskIds, workDesks } from "@/lib/work-desks";

const chapters = [
  { id: "model", label: "The model" },
  { id: "path", label: "How work moves" },
  { id: "thread", label: "The operation" },
  { id: "desks", label: "Desks" },
  { id: "companies", label: "Zoom companies" },
  { id: "money", label: "Money" },
  { id: "accounting", label: "Accounting" },
  { id: "files", label: "Files and access" },
  { id: "build", label: "How it is built" },
] as const;

const nouns = [
  {
    code: "ZGC-CON",
    title: "Contact",
    line: "A person.",
    detail: "Staff, candidate, driver, or the human you speak to at a client. If they are human, they are a contact.",
  },
  {
    code: "ZGC-ORG",
    title: "Organization",
    line: "A company.",
    detail: "Client, supplier, carrier, hotel, landlord, or a government office. The company is the party on the file.",
  },
  {
    code: "ZGC-OPS",
    title: "Operation",
    line: "The work file.",
    detail: "Hiring, a shipment, a campaign, a lease, a quotation, and an invoice all live on one operation.",
  },
] as const;

const path = [
  {
    step: "01",
    title: "A call comes in",
    body: "Sales logs an enquiry. It gets a ZGC-INQ code and stays a note until someone opens it as work.",
    href: "/sales",
    hrefLabel: "Sales",
  },
  {
    step: "02",
    title: "Name the party",
    body: "A person becomes a contact. A company becomes an organization. One operation can point at both.",
    href: "/contacts",
    hrefLabel: "Contacts",
  },
  {
    step: "03",
    title: "Open the file",
    body: "The operation belongs to one Zoom company, such as Logistics or Real Estate, and receives a ZGC-OPS code.",
    href: "/operations",
    hrefLabel: "Operations",
  },
  {
    step: "04",
    title: "Work on the thread",
    body: "Updates, to-dos, documents, and money are entries on that file. Other screens only point back here.",
    href: "/now",
    hrefLabel: "Now",
  },
] as const;

const moneyRows = [
  {
    direction: "In",
    items: "Quotation, proposal, invoice, lease, tenancy",
    meaning: "What the client is offered or billed.",
  },
  {
    direction: "Out",
    items: "Procurement, cost",
    meaning: "What Zoom pays a vendor, or spends, on the same file.",
  },
  {
    direction: "None",
    items: "Update, meeting, to-do, document, shipment, hire",
    meaning: "The work itself. These entries carry no amount.",
  },
] as const;

const buildLayers = [
  {
    name: "Screens",
    where: "src/app",
    detail: "Next.js pages. The sidebar, Operations, Sales, and each desk are routes. API routes under src/app/api save the work.",
  },
  {
    name: "Rules",
    where: "src/lib",
    detail: "How an enquiry becomes an operation, how codes are issued, how money lines are copied, and who may open a page.",
  },
  {
    name: "Tables",
    where: "src/db/schema.ts",
    detail: "Drizzle describes Postgres: users, organizations, contacts, operations, thread entries, document lines, Drive files, and the accounting journals, accounts, VAT, payroll, and employees.",
  },
  {
    name: "Database",
    where: "Supabase Postgres",
    detail: "The live data. The app talks to it with the DATABASE_URL connection. Pausing the Supabase project pauses sign-in and every list.",
  },
  {
    name: "Sign-in",
    where: "src/lib/auth.ts",
    detail: "Usernames and bcrypt password hashes live in the users table. A signed cookie (jose) keeps the session. This is separate from Supabase Auth.",
  },
  {
    name: "Files",
    where: "Google Drive",
    detail: "Settings connects one workspace Drive account. Uploads from an organization, contact, or operation are stored there and recorded in drive_files.",
  },
] as const;

const accountingScreens = [
  {
    href: "/accounting",
    title: "Accounting overview",
    detail:
      "Cash, bank, customer receivables, and supplier payables as of the end date. Sales, expenses, and profit for the selected period. Overdue invoices are counted from the current invoice status.",
  },
  {
    href: "/accounting/sales",
    title: "Sales & Invoices",
    detail:
      "Customer invoices on operations. A draft does not post. Sending it, marking it overdue, or marking it paid posts accounts receivable and sales once. Returning it to draft reverses that journal.",
  },
  {
    href: "/accounting/purchases",
    title: "Purchases & Expenses",
    detail:
      "Supplier bills, expenses, and the purchase and cost entries from operations. A received procurement posts Purchases and Accounts Payable. A linked supplier bill records the invoice against that payable when the supplier, company, currency, and amount match. A cost note does not post until an expense is linked to it or the cost ledger is used.",
  },
  {
    href: "/accounting/payments",
    title: "Payments & Receipts",
    detail:
      "A customer receipt debits cash or bank and clears the receivable. A supplier payment debits the payable and credits cash or bank. When the receivable reaches zero, the invoice is marked paid.",
  },
  {
    href: "/accounting/employees",
    title: "Employees",
    detail:
      "The people who work for one Zoom company: name, job, monthly salary, SIO or GOSI scheme, start date, phone, email, and active or left. Delete removes the person from this list. Their login stays on Users.",
  },
  {
    href: "/accounting/banking",
    title: "Banking",
    detail:
      "Cash and bank accounts, statement import, reconciliation against the book balance, deposits, withdrawals, charges, interest, and transfers between accounts.",
  },
  {
    href: "/accounting/ledgers",
    title: "Ledgers",
    detail:
      "Customer and supplier balances from posted journals. A customer and a supplier are the same organization record, not a second copy.",
  },
  {
    href: "/accounting/accounts",
    title: "Chart of Accounts",
    detail:
      "Each company has assets, liabilities, equity, income, and expenses, plus open and closed fiscal periods. Opening balances are entered here.",
  },
  {
    href: "/accounting/journals",
    title: "Journal Entries",
    detail:
      "The ledger. Invoices, bills, payments, payroll, and manual entries become journals. A draft journal is not in the reports. Posting requires an open period. Reversal writes the opposite entry.",
  },
  {
    href: "/accounting/vat",
    title: "VAT",
    detail:
      "Bahrain VAT at 10% from 1 January 2022, plus zero-rated, exempt, out of scope, reverse charge, import, and non-recoverable codes. Prepare the return from the ledger, lock the period, then file the National Bureau for Revenue boxes. Locking stops further VAT postings in that period. All companies is not a VAT group return.",
  },
  {
    href: "/accounting/reports",
    title: "Reports",
    detail:
      "Profit and loss, balance sheet, trial balance, general ledger, cash movement, cash flow, customer and supplier outstanding, receivable and payable aging, expenses, VAT, sales, purchases, bank reconciliation, statements, and operation profitability. Excel, PDF, and print read the same posted figures.",
  },
  {
    href: "/accounting/analytics",
    title: "Analytics",
    detail:
      "Monthly revenue, cost of purchases, operating expenses, cash, and a comparison across companies for the selected dates.",
  },
  {
    href: "/accounting/control",
    title: "Control",
    detail:
      "Payment reminders, an expense paid by one Zoom company for another, inventory quantities, a calculated payroll posting, and grants that limit a user to selected companies.",
  },
  {
    href: "/accounting/desk",
    title: "Operation money",
    detail:
      "Sale, estimate, order, delivery, and return start from the party. The invoice and quotation that open are the same documents as before, and they still live on the operation.",
  },
] as const;

function activityLabel(slug: string) {
  return (
    defaultOperationActivityTypes.find((type) => type.slug === slug)?.label ??
    slug
  );
}

function SectionTitle({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header id={id} className="scroll-mt-8">
      <p className="text-xs font-semibold tracking-wide text-zoom-medium uppercase">
        {kicker}
      </p>
      <h2 className="mt-1">{title}</h2>
      <Text className="mt-2 max-w-3xl">{children}</Text>
    </header>
  );
}

export function SystemGuide({
  showBuild = true,
  showUsers = false,
}: {
  showBuild?: boolean;
  showUsers?: boolean;
}) {
  const visibleChapters = showBuild
    ? chapters
    : chapters.filter((chapter) => chapter.id !== "build");

  return (
    <article className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold tracking-wide text-zoom-medium uppercase">
        Zoom ERP
      </p>
      <Heading className="mt-2">How this system works</Heading>
      <Text className="mt-3 max-w-3xl text-base">
        One work file holds the job. People, companies, money, and documents
        hang off that file. The other pages are windows onto it.
      </Text>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Guide sections">
        {visibleChapters.map((chapter) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            className="rounded-full bg-white px-3 py-1 text-sm text-zoom-dark ring-1 ring-zinc-200 hover:bg-zoom-palest dark:bg-surface-elevated dark:text-heading dark:ring-border"
          >
            {chapter.label}
          </a>
        ))}
      </nav>

      <section className="mt-12">
        <SectionTitle id="model" kicker="01" title="Three records, one file">
          Everything in Zoom ERP is one of these. A fourth idea, the Zoom
          company, only says which part of the group owns the file.
        </SectionTitle>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {nouns.map((noun) => (
            <div
              key={noun.code}
              className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border"
            >
              <p className="font-mono text-xs text-zoom-medium">{noun.code}</p>
              <h3 className="mt-2">{noun.title}</h3>
              <p className="mt-1 text-sm font-medium text-zoom-navy dark:text-heading">
                {noun.line}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
                {noun.detail}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-2xl bg-zoom-navy px-5 py-4 text-sm text-white">
          <p className="font-medium">Zoom company</p>
          <p className="mt-1 text-zoom-pale dark:text-zoom-soft">
            Logistics, Real Estate, Advertising, Administration, and the rest.
            The company is chosen on the operation. It does not replace the
            client.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle id="path" kicker="02" title="How a job starts">
          Work does not stay on the screen where it was typed. Sales, HR, and
          Logistics each open the same kind of file.
        </SectionTitle>
        <ol className="mt-6 grid gap-3 md:grid-cols-4">
          {path.map((item) => (
            <li
              key={item.step}
              className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border"
            >
              <p className="font-mono text-xs text-zoom-light">{item.step}</p>
              <h3 className="mt-2 text-base">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
                {item.body}
              </p>
              <Link
                href={item.href}
                className="mt-3 inline-block text-sm font-medium text-zoom-dark"
              >
                {item.hrefLabel}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <SectionTitle id="thread" kicker="03" title="Inside an operation">
          Open a file and the thread is the record. Lists elsewhere are
          shortcuts back to a row on this thread.
        </SectionTitle>
        <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
          <div className="border-b border-zinc-100 bg-zoom-palest px-5 py-4">
            <p className="font-mono text-xs text-zoom-medium">ZGC-OPS-1042</p>
            <p className="mt-1 text-lg font-semibold text-zoom-navy dark:text-heading">
              Shipment for Gulf Trading
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-text-secondary">
              Zoom Logistics · organization Gulf Trading · contact Layla Hassan
            </p>
          </div>
          <ul className="divide-y divide-zinc-100">
            {[
              ["Update", "Cargo booked with the carrier."],
              ["To-do", "Confirm the collection window."],
              ["Procurement", "Carrier rate, money out."],
              ["Quotation", "Client offer, money in."],
              ["Invoice", "Raised after the quotation is accepted."],
            ].map(([kind, line]) => (
              <li key={kind} className="flex gap-4 px-5 py-3 text-sm">
                <span className="w-28 shrink-0 font-medium text-zoom-dark">
                  {kind}
                </span>
                <span className="text-zinc-600 dark:text-text-secondary">{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activityTypeGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border"
            >
              <h3 className="text-base">{group.label}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
                {group.slugs.map((slug) => activityLabel(slug)).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle id="desks" kicker="04" title="Desks look at the same files">
          Human Resources, Logistics, Inventory, Marketing, Planning, and the
          operation-money desk filter operations or thread entries and can
          start the right kind of file. The company books are a ledger of
          their own, described under Accounting.
        </SectionTitle>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {workDeskIds.map((id) => {
            const desk = workDesks[id];
            return (
              <div
                key={desk.id}
                className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base">{desk.title}</h3>
                  <Link
                    href={desk.href}
                    className="text-sm font-medium text-zoom-dark"
                  >
                    Open
                  </Link>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
                  {desk.blurb}
                </p>
                <p className="mt-3 text-sm text-zoom-navy dark:text-heading">
                  {desk.starts.map((start) => start.label).join(" · ")}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle id="companies" kicker="05" title="Which Zoom company owns the work">
          The client is an organization. The owner of the file is a Zoom
          company. Administration is internal work: staff, visas, office.
          Group is the holding view when a job is not yet with one company.
        </SectionTitle>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {divisions.map((division) => (
            <li
              key={division.id}
              className="flex gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border"
            >
              <span className="w-10 shrink-0 font-mono text-xs font-semibold text-zoom-medium">
                {division.acronym}
              </span>
              <span>
                <span className="block text-sm font-medium text-zoom-navy dark:text-heading">
                  {division.name}
                </span>
                <span className="mt-0.5 block text-sm text-zinc-600 dark:text-text-secondary">
                  {division.description}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <Link href="/divisions" className="font-medium text-zoom-dark">
            Company profiles
          </Link>
        </p>
      </section>

      <section className="mt-14">
        <SectionTitle id="money" kicker="06" title="Money stays on the file">
          A quotation is an entry. An invoice is an entry made from that
          quotation. Procurement is the vendor side of the same job. Finalizing
          the document posts it into that Zoom company&apos;s books. A draft
          stays off the ledger.
        </SectionTitle>
        <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-zoom-palest text-zoom-dark">
              <tr>
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Entries</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Meaning
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {moneyRows.map((row) => (
                <tr key={row.direction}>
                  <td className="px-4 py-3 font-medium text-zoom-navy dark:text-heading">
                    {row.direction}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-foreground">{row.items}</td>
                  <td className="hidden px-4 py-3 text-zinc-600 dark:text-text-secondary sm:table-cell">
                    {row.meaning}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
          Document lines hold quantity and unit amount. Stages such as draft,
          sent, accepted, and paid sit on the entry. A Google Doc can be
          generated from a quotation or invoice when Drive is connected. The
          books themselves are the next section.
        </p>
      </section>

      <section className="mt-14">
        <SectionTitle id="accounting" kicker="07" title="The company books">
          Each Zoom company has its own chart, journals, bank accounts, VAT,
          and employees. Amounts are in BHD. Choose one company or all
          companies, a financial year, or a from and to date. All companies is
          a consolidated total in BHD: each company is converted at the latest
          saved exchange rate, and balances owed between Zoom companies are
          removed. Save a rate before a foreign-currency company can join that
          total.
        </SectionTitle>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {accountingScreens.map((screen) => (
            <div
              key={screen.href}
              className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base">{screen.title}</h3>
                <Link href={screen.href} className="text-sm font-medium text-zoom-dark">
                  Open
                </Link>
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
                {screen.detail}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
            <h3 className="text-base">What reaches the ledger</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
              Posted journals only. The dashboard, reports, VAT, and analytics
              ignore drafts. A closed fiscal period refuses a new posting. A
              locked VAT period refuses a VAT posting inside it. An
              administrator posts journals. Other staff can prepare them.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
            <h3 className="text-base">Payroll</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
              Control calculates the employee deduction, the employer
              insurance, and end-of-service from the wage, the scheme, and the
              years of service, then posts salaries, net pay, and the amount
              payable to SIO or GOSI. Bahraini SIO uses the employer rate in
              force on the pay date. Non-Bahraini end-of-service is 4.2% for
              the first three years and 8.4% after that. Saudi GOSI follows
              the registration date, and non-Saudi end-of-service accrues half
              a month a year for the first five years and one month a year
              after that.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
            <h3 className="text-base">Stock and group balances</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
              Company-owned receipts debit inventory at moving weighted average
              and credit the payable. Sales and issues move that cost to cost
              of goods sold. Customer-owned goods change the custody quantity
              and do not post an asset. An expense paid by one Zoom company
              for another posts due-from and due-to. The group total removes
              those balances.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle id="files" kicker="08" title="Files, accounts, and attention">
          Three practical pieces sit beside the work file.
        </SectionTitle>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
            <h3 className="text-base">Drive</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
              One Google account is connected in Settings. Organizations,
              contacts, and operations get folders. Staff upload through Zoom
              ERP.
            </p>
            <Link href="/settings" className="mt-3 inline-block text-sm font-medium text-zoom-dark">
              Settings
            </Link>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
            <h3 className="text-base">Users</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
              Sign-in is a username and password. Admin manages staff. Employee
              works the files. Client is reserved and does not open these desks.
            </p>
            {showUsers ? (
              <Link href="/users" className="mt-3 inline-block text-sm font-medium text-zoom-dark">
                Users
              </Link>
            ) : null}
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
            <h3 className="text-base">Now</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-text-secondary">
              Now is the daily queue: quiet files, quotes waiting, and the
              latest thread updates. It is a reading of operations, not a new
              kind of record.
            </p>
            <Link href="/now" className="mt-3 inline-block text-sm font-medium text-zoom-dark">
              Now
            </Link>
          </div>
        </div>
      </section>

      {showBuild ? (
        <section className="mt-14 mb-8">
          <SectionTitle id="build" kicker="09" title="How it is built">
            The product is one Next.js app. The pages, the rules, and the
            database describe the same model you see above.
          </SectionTitle>
          <ol className="mt-6 space-y-3">
            {buildLayers.map((layer, index) => (
              <li
                key={layer.name}
                className="grid gap-2 rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-surface dark:ring-border sm:grid-cols-[9rem_1fr]"
              >
                <div>
                  <p className="font-mono text-xs text-zoom-light">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-base">{layer.name}</h3>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{layer.where}</p>
                </div>
                <p className="text-sm leading-6 text-zinc-600 dark:text-text-secondary">
                  {layer.detail}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-zinc-600 dark:text-text-secondary">
            <Link href="/functions" className="font-medium text-zoom-dark">
              Functions
            </Link>{" "}
            is the index of every screen. Ctrl+K jumps to a page or starts a
            file.
          </p>
        </section>
      ) : null}
    </article>
  );
}
