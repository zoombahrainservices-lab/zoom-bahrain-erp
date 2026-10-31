import { eq } from "drizzle-orm";

import { AccountingFilters } from "@/components/accounting/filters";
import { VatCodeForm } from "@/components/accounting/forms";
import { FilingForm, PhaseAction, VatPrepareForm, VatSettingsForm, ExchangeRateForm } from "@/components/accounting/phase2-forms";
import { DataTable, Panel } from "@/components/accounting/ui";
import { db } from "@/db";
import { accountingSettings, accountingVatReturns } from "@/db/schema";
import { loadAccountingPage } from "@/lib/accounting/page";
import { filsToAmount } from "@/lib/accounting/money";
import { nbrVatStatement, vatPosition } from "@/lib/accounting/phase2";
import { listVatCodes } from "@/lib/accounting/queries";
import { buildReport } from "@/lib/accounting/reports";
import { getDivisionName } from "@/lib/divisions";

export default async function VatPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const companyId = page.filter.companyId;
  const [codes, summary, settings, returns, position, nbr] = await Promise.all([
    listVatCodes(companyId),
    buildReport("vat-summary", page.filter),
    companyId === "all"
      ? Promise.resolve(null)
      : db.query.accountingSettings.findFirst({ where: eq(accountingSettings.companyId, companyId) }),
    db.query.accountingVatReturns.findMany({
      where: companyId === "all" ? undefined : eq(accountingVatReturns.companyId, companyId),
      limit: 24,
    }),
    companyId === "all" ? Promise.resolve(null) : vatPosition(companyId, page.filter.from, page.filter.to),
    companyId === "all" ? Promise.resolve(null) : nbrVatStatement(companyId, page.filter.from, page.filter.to),
  ]);

  return (
    <div className="space-y-6">
      <AccountingFilters filter={page.filter} companies={page.companies} />
      <Panel title="Bahrain VAT">
        <p className="text-sm text-text-secondary">
          The standard rate in this chart is 10%, effective in the tax codes from 1 January 2022. Prepare the return from the ledger, review it, lock the period, then file it. Filing writes the National Bureau for Revenue boxes against this company's VAT account number: standard-rated sales, zero-rated sales, exempt sales, standard-rated purchases, imports, and reverse charge. The filing reference is NBR, the VAT account number, and the period end. Locking the period stops further VAT postings in that period.
        </p>
        {position && nbr ? (
          <p className="mt-3 text-sm text-foreground">
            Standard sales {filsToAmount(nbr.standardSales)} (VAT {filsToAmount(nbr.standardSalesVat)}) · zero-rated {filsToAmount(nbr.zeroRatedSales)} · exempt {filsToAmount(nbr.exemptSales)} · standard purchases {filsToAmount(nbr.standardPurchases)} (VAT {filsToAmount(nbr.standardPurchasesVat)}) · imports {filsToAmount(nbr.imports)} (VAT {filsToAmount(nbr.importVat)}) · reverse charge {filsToAmount(nbr.reverseChargePurchases)} (VAT {filsToAmount(nbr.reverseChargeVat)}) · net {filsToAmount(position.net)} for {page.filter.from} to {page.filter.to}. Positive net is payable. Negative net is refundable.
          </p>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">Choose one company to see its VAT position. The all-companies total is not a VAT group return.</p>
        )}
      </Panel>
      {settings && page.canManageSettings ? (
        <Panel title="Registration and invoice details">
          <VatSettingsForm
            companyId={companyId}
            initial={{
              legalName: settings.legalName,
              address: settings.address,
              phone: settings.phone,
              email: settings.email,
              crNumber: settings.crNumber,
              vatRegistered: settings.vatRegistered === 1,
              vatNumber: settings.vatNumber,
              vatEffectiveFrom: settings.vatEffectiveFrom ?? "",
              filingFrequency: settings.filingFrequency,
            }}
          />
        </Panel>
      ) : null}
      {companyId !== "all" ? (
        <Panel title="Exchange rates">
          <p className="mb-3 text-sm text-text-secondary">
            Bills and expenses in another currency use the rate entered on that document. The latest rate saved on or before the period end is also used when all companies are shown together, so those books can be stated in BHD. No rate is invented.
          </p>
          <ExchangeRateForm companyId={companyId} />
        </Panel>
      ) : null}
      {companyId !== "all" ? (
        <Panel title="VAT return working paper">
          <VatPrepareForm companyId={companyId} />
          <ul className="mt-4 space-y-3 text-sm">
            {returns.map((row) => (
              <li key={row.id}>
                <span className="text-foreground">
                  {row.periodStart} to {row.periodEnd} · due {row.dueOn} · {row.status} · output {row.outputVat} · input {row.inputVat} · net {row.netVat}
                  {row.filingReference ? ` · reference ${row.filingReference}` : ""} · {row.paymentStatus}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {page.canPost && row.status === "draft" ? <PhaseAction action="reviewVat" id={row.id} label="Mark reviewed" /> : null}
                  {page.canPost && row.status === "reviewed" ? <PhaseAction action="lockVat" id={row.id} label="Lock period" /> : null}
                  <a className="text-sm font-medium text-heading" href={`/api/accounting/pdf?kind=report&report=vat-summary&company=${companyId}&from=${row.periodStart}&to=${row.periodEnd}`}>PDF</a>
                </div>
                {page.canPost && row.status === "locked" ? <FilingForm id={row.id} /> : null}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      <Panel title="Tax codes">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="text-text-secondary">
              <tr>
                {["Company", "Code", "Name", "Rate", "Treatment"].map((header) => (
                  <th key={header} className="border-b border-border px-3 py-2 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={code.id}>
                  <td className="border-b border-border px-3 py-2">{getDivisionName(code.companyId)}</td>
                  <td className="border-b border-border px-3 py-2">{code.code}</td>
                  <td className="border-b border-border px-3 py-2">{code.name}</td>
                  <td className="border-b border-border px-3 py-2 tabular-nums">{code.rate}%</td>
                  <td className="border-b border-border px-3 py-2">{code.treatment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {page.canManageSettings ? (
        <Panel title="Add a VAT code">
          <VatCodeForm companies={page.companies} />
        </Panel>
      ) : null}
      <Panel title={summary.title}>
        <p className="mb-3 text-sm text-text-secondary">{summary.note}</p>
        <DataTable headers={summary.headers} rows={summary.rows} />
      </Panel>
    </div>
  );
}
