import Link from "next/link";

import { AccountingFilters } from "@/components/accounting/filters";
import { Money, Panel } from "@/components/accounting/ui";
import { filterQuery } from "@/lib/accounting/filters";
import { loadAccountingPage } from "@/lib/accounting/page";
import { partyBalances } from "@/lib/accounting/queries";

export default async function LedgersPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const query = filterQuery(page.filter);
  const [customers, suppliers] = await Promise.all([
    partyBalances(page.filter, "receivable"),
    partyBalances(page.filter, "payable"),
  ]);

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <p className="text-sm text-text-secondary">
        Ledgers use the existing organization records. A customer and a supplier are not stored twice.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <PartyList title="Customers" rows={customers} query={query} />
        <PartyList title="Suppliers" rows={suppliers} query={query} />
      </div>
    </div>
  );
}

function PartyList({
  title,
  rows,
  query,
}: {
  title: string;
  query: string;
  rows: Array<{
    organization_id: string | null;
    contact_id: string | null;
    name: string | null;
    companyName: string;
    balanceFils: bigint;
  }>;
}) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">No outstanding balances.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((row) => {
            const href = row.organization_id
              ? `/accounting/ledgers/${row.organization_id}?${query}`
              : `/accounting/ledgers/contact/${row.contact_id}?${query}`;
            return (
              <li key={`${row.organization_id}-${row.contact_id}-${row.companyName}`} className="flex justify-between gap-3">
                <Link href={href} className="text-heading">
                  {row.name} · {row.companyName}
                </Link>
                <Money fils={row.balanceFils} />
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
