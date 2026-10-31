import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CalculatorIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PlusIcon,
  ShoppingCartIcon,
} from "@heroicons/react/20/solid";
import Link from "next/link";

import { AccountingFilters } from "@/components/accounting/filters";
import { GroupNotice, Money, Panel } from "@/components/accounting/ui";
import type { CompanySnapshot } from "@/lib/accounting/queries";
import { filterQuery, type AccountingFilter } from "@/lib/accounting/filters";
import type { HomeMonth } from "@/lib/accounting/home-series";
import { filsToAmount } from "@/lib/accounting/money";
import { getDivisionName } from "@/lib/divisions";
import { formatBhd } from "@/lib/utils";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function HomeDashboard({
  filter,
  companies,
  figures,
  missingRates,
  months,
  truncated,
  recent,
}: {
  filter: AccountingFilter;
  companies: Array<{ id: string; name: string }>;
  figures: CompanySnapshot;
  missingRates: string[];
  months: HomeMonth[];
  truncated: boolean;
  recent: Array<{
    id: string;
    companyId: string;
    journalNumber: string;
    entryDate: string;
    description: string;
    sourceType: string;
  }>;
}) {
  const query = filterQuery(filter);
  const period = `${filter.from} to ${filter.to}`;
  const shortcuts: Array<{ href: string; label: string; icon: Icon }> = [
    { href: "/accounting/start/sale-invoice", label: "Add Sale", icon: PlusIcon },
    { href: "/accounting/start/quotation", label: "Add Estimate", icon: DocumentTextIcon },
    { href: "/accounting/purchases?new=bill", label: "Add Purchase", icon: ShoppingCartIcon },
    { href: "/accounting/receipts?new=1", label: "Payment In", icon: ArrowDownIcon },
    { href: "/accounting/payouts?new=1", label: "Payment Out", icon: ArrowUpIcon },
    { href: `/accounting/sales?${query}`, label: "Sale Invoices", icon: BanknotesIcon },
    { href: `/accounting/purchases?${query}`, label: "Bills & Expenses", icon: DocumentTextIcon },
    { href: `/accounting/payments?${query}`, label: "Payments & Receipts", icon: ArrowsRightLeftIcon },
    { href: `/accounting/banking?${query}`, label: "Bank Accounts", icon: BuildingLibraryIcon },
    { href: `/accounting/reports?${query}`, label: "Reports", icon: ChartBarIcon },
    { href: "/accounting/journals/new", label: "Journal entry", icon: CalculatorIcon },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-heading">Home</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {filter.companyId === "all"
              ? "Consolidated in BHD."
              : figures.currency === "BHD"
                ? "Amounts are in BHD."
                : `This company's books are in ${figures.currency}. The BHD number format is used, and the amount is not converted.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/accounting/start/sale-invoice"
            className="inline-flex h-8 items-center rounded-full bg-[#e4546b] px-3 text-xs font-semibold text-white hover:bg-[#d4475e]"
          >
            + Add Sale
          </Link>
          <Link
            href="/accounting/purchases?new=bill"
            className="inline-flex h-8 items-center rounded-full bg-[#d7f0fb] px-3 text-xs font-semibold text-[#0b6f9a] hover:bg-[#c5e8f8]"
          >
            + Add Purchase
          </Link>
        </div>
      </div>

      <AccountingFilters filter={filter} companies={companies} />
      <GroupNotice show={filter.companyId === "all"} />
      {missingRates.length > 0 ? (
        <p className="text-sm text-text-secondary">
          Save an exchange rate to BHD before these companies can be included in the consolidated total: {missingRates.join(", ")}.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Summary
          icon={BanknotesIcon}
          label="Total Sales"
          value={<Money fils={figures.sales} />}
          hint={`Posted sales revenue in ${period}.`}
          href={`/accounting?${query}`}
        />
        <Summary
          icon={ShoppingCartIcon}
          label="Total Purchases"
          value={<Money fils={figures.purchases} />}
          hint={`Posted purchase accounts in ${period}.`}
          href={`/accounting/reports/profit-and-loss?${query}`}
        />
        <Summary
          icon={ArrowDownIcon}
          label="To Receive"
          value={<Money fils={figures.receivables} />}
          hint={`Customer receivables as of ${filter.to}.`}
          href={`/accounting/reports/customer-outstanding?${query}`}
        />
        <Summary
          icon={ArrowUpIcon}
          label="To Pay"
          value={<Money fils={figures.payables} />}
          hint={`Supplier payables as of ${filter.to}.`}
          href={`/accounting/reports/supplier-outstanding?${query}`}
        />
        <Summary
          icon={BanknotesIcon}
          label="Cash in Hand"
          value={<Money fils={figures.cash} />}
          hint={`Cash balance as of ${filter.to}.`}
          href={`/accounting/banking?${query}`}
        />
        <Summary
          icon={BuildingLibraryIcon}
          label="Bank Balance"
          value={<Money fils={figures.bank} />}
          hint={`Bank balance as of ${filter.to}.`}
          href={`/accounting/banking?${query}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Sales & Purchases">
          <p className="mb-3 text-sm text-text-secondary">
            Posted sales revenue and purchase accounts in the selected period. An operation invoice is counted through the journal it posted, not a second time as a document.
          </p>
          <TrendChart
            label="Sales and purchases by month"
            months={months}
            left={{ name: "Sales", values: months.map((month) => month.sales), fill: "#065274" }}
            right={{ name: "Purchases", values: months.map((month) => month.purchases), fill: "#e4546b" }}
            empty="No posted sales or purchases in this period."
          />
          {truncated ? (
            <p className="mt-2 text-xs text-text-secondary">The chart shows the latest 36 months. The totals above cover the full selected period.</p>
          ) : null}
        </Panel>
        <Panel title="Money In & Money Out">
          <p className="mb-3 text-sm text-text-secondary">
            Cash and bank accounts in the selected period. Transfers between those accounts, and reversals of those transfers, are left out.
          </p>
          <TrendChart
            label="Money in and money out by month"
            months={months}
            left={{ name: "Money in", values: months.map((month) => month.moneyIn), fill: "#065274" }}
            right={{ name: "Money out", values: months.map((month) => month.moneyOut), fill: "#0b6f9a" }}
            empty="No external cash or bank movement in this period."
          />
          {truncated ? (
            <p className="mt-2 text-xs text-text-secondary">The chart shows the latest 36 months. The cards above cover the full selected period.</p>
          ) : null}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <Panel title="Recent transactions">
          <p className="mb-3 text-sm text-text-secondary">Posted journals in {period}.</p>
          {recent.length === 0 ? (
            <p className="text-sm text-text-secondary">No posted journals in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-foreground">
                <thead className="text-text-secondary">
                  <tr>
                    {["Date", "Journal", "Type", "Description", filter.companyId === "all" ? "Company" : null]
                      .filter((header): header is string => header !== null)
                      .map((header) => (
                        <th key={header} className="border-b border-border px-2 py-2 font-medium">{header}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((journal) => (
                    <tr key={journal.id}>
                      <td className="border-b border-border px-2 py-2 whitespace-nowrap">{journal.entryDate}</td>
                      <td className="border-b border-border px-2 py-2">
                        <Link href={`/accounting/journals/${journal.id}`} className="font-medium text-heading">
                          {journal.journalNumber}
                        </Link>
                      </td>
                      <td className="border-b border-border px-2 py-2 capitalize">{journal.sourceType.replaceAll("_", " ")}</td>
                      <td className="border-b border-border px-2 py-2">{journal.description}</td>
                      {filter.companyId === "all" ? (
                        <td className="border-b border-border px-2 py-2">{getDivisionName(journal.companyId)}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Shortcuts">
          <ul className="grid grid-cols-2 gap-2">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              return (
                <li key={shortcut.label}>
                  <Link
                    href={shortcut.href}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground ring-1 ring-border hover:bg-surface-elevated"
                  >
                    <Icon className="size-4 shrink-0 text-heading" aria-hidden="true" />
                    <span>{shortcut.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: Icon;
  label: string;
  value: ReactNode;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-xl bg-surface p-3 ring-1 ring-border hover:bg-surface-elevated">
      <p className="flex items-center gap-1.5 text-sm text-text-secondary">
        <Icon className="size-4 shrink-0 text-heading" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-heading">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{hint}</p>
    </Link>
  );
}

function TrendChart({
  label,
  months,
  left,
  right,
  empty,
}: {
  label: string;
  months: HomeMonth[];
  left: { name: string; values: bigint[]; fill: string };
  right: { name: string; values: bigint[]; fill: string };
  empty: string;
}) {
  const values = [...left.values, ...right.values];
  if (!values.some((value) => value !== 0n)) {
    return <p className="text-sm text-text-secondary">{empty}</p>;
  }
  const max = values.reduce((peak, value) => {
    const abs = value < 0n ? -value : value;
    return abs > peak ? abs : peak;
  }, 1n);
  const negative = values.some((value) => value < 0n);
  const height = 112;
  const group = 44;
  const width = Math.max(months.length * group, group);
  const span = negative ? height / 2 : height;
  const zero = negative ? height / 2 : height;

  function heightOf(value: bigint) {
    const abs = value < 0n ? -value : value;
    return Number((abs * 10000n) / max) / 10000 * span;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: left.fill }} />
          {left.name}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: right.fill }} />
          {right.name}
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label={label}
          width={width}
          height={height + 28}
          viewBox={`0 0 ${width} ${height + 28}`}
          className="min-w-full"
        >
          <line x1="0" x2={width} y1={zero} y2={zero} className="stroke-border" strokeWidth="1" />
          {months.map((month, index) => {
            const x = index * group;
            const leftHeight = heightOf(left.values[index] ?? 0n);
            const rightHeight = heightOf(right.values[index] ?? 0n);
            const leftValue = left.values[index] ?? 0n;
            const rightValue = right.values[index] ?? 0n;
            const [year, monthNumber] = month.month.split("-");
            const name = monthNames[Number(monthNumber) - 1] ?? month.month;
            const previousYear = months[index - 1]?.month.slice(0, 4);
            const caption = !previousYear || previousYear !== year ? `${name} ${year}` : name;
            return (
              <g key={month.month}>
                <rect
                  x={x + 6}
                  y={leftValue < 0n ? zero : zero - leftHeight}
                  width="12"
                  height={leftHeight}
                  fill={left.fill}
                >
                  <title>{`${caption} ${left.name} ${formatBhd(filsToAmount(leftValue))}`}</title>
                </rect>
                <rect
                  x={x + 22}
                  y={rightValue < 0n ? zero : zero - rightHeight}
                  width="12"
                  height={rightHeight}
                  fill={right.fill}
                >
                  <title>{`${caption} ${right.name} ${formatBhd(filsToAmount(rightValue))}`}</title>
                </rect>
                <text x={x + group / 2} y={height + 16} textAnchor="middle" className="fill-text-secondary text-[10px]">
                  {caption}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
