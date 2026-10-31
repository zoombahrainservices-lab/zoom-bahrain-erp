import { Panel } from "@/components/accounting/ui";

type SubledgerRow = {
  companyId: string;
  sku: string;
  name: string;
  legacyQuantity: string;
  legacyAverage: string;
  legacyValue: string;
  subledgerQuantity: string;
  subledgerAverage: string;
  subledgerValue: string;
  pendingQuantity: string;
  difference: string;
  status: string;
  latestMovement: string;
  journalReference: string;
  journalBlockReason: string;
  postingStatus: string;
};

export function StockSubledger({ rows }: { rows: SubledgerRow[] }) {
  return (
    <Panel title="New stock subledger">
      <p className="mb-3 text-sm text-text-secondary">
        This is the new posted stock record. It is not the legacy accounting stock above, and the two quantities are not added together. A zero in this list is not the company&apos;s existing stock. Customer-owned custody is kept on the Inventory Desk and is not an inventory asset. Inventory journals stay off until procurement and capitalization are verified.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-text-secondary">
            <tr>
              <th className="px-2 py-2 font-medium">SKU</th>
              <th className="px-2 py-2 font-medium">Legacy quantity</th>
              <th className="px-2 py-2 font-medium">Legacy value</th>
              <th className="px-2 py-2 font-medium">Subledger quantity</th>
              <th className="px-2 py-2 font-medium">Average</th>
              <th className="px-2 py-2 font-medium">Subledger value</th>
              <th className="px-2 py-2 font-medium">Pending valuation</th>
              <th className="px-2 py-2 font-medium">Latest</th>
              <th className="px-2 py-2 font-medium">Journal</th>
              <th className="px-2 py-2 font-medium">Posting</th>
              <th className="px-2 py-2 font-medium">Reconciliation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.companyId}-${row.sku}`} className="border-t border-border">
                <td className="px-2 py-2">{row.sku}{row.name ? ` · ${row.name}` : ""}</td>
                <td className="px-2 py-2 tabular-nums">{row.legacyQuantity}</td>
                <td className="px-2 py-2 tabular-nums">{row.legacyValue}</td>
                <td className="px-2 py-2 tabular-nums">{row.subledgerQuantity}</td>
                <td className="px-2 py-2 tabular-nums">{row.subledgerAverage}</td>
                <td className="px-2 py-2 tabular-nums">{row.subledgerValue}</td>
                <td className="px-2 py-2 tabular-nums">{row.pendingQuantity}</td>
                <td className="px-2 py-2">{row.latestMovement}</td>
                <td className="px-2 py-2">{row.journalReference}{row.journalBlockReason ? ` · ${row.journalBlockReason}` : ""}</td>
                <td className="px-2 py-2">{row.postingStatus}</td>
                <td className="px-2 py-2">{row.status}{row.status === "Matched" ? "" : ` · difference ${row.difference}`}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-text-secondary" colSpan={11}>
                  No company-owned rows in the new subledger. Existing stock remains in the legacy list and has not been migrated.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
