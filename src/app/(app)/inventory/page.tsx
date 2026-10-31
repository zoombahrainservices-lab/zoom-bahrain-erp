import { WorkDeskPage } from "@/components/work-desk-page";
import { InventoryStockDesk } from "@/components/inventory/stock-desk";
import { allowedCompanyIds } from "@/lib/accounting/phase3";
import { divisions } from "@/lib/divisions";
import { canManageOperations, canPostJournals, canViewAccounting, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { loadInventoryDesk } from "@/lib/stock/read";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ stockCompany?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  let companies: Array<{ id: string; name: string }> = [];
  let desk = null;
  if (session && !isClientUser(session)) {
    const allowed = await allowedCompanyIds(session.userId, session.role);
    companies = divisions
      .filter((division) => allowed === "all" || allowed.includes(division.id))
      .map((division) => ({ id: division.id, name: division.name }));
    const requested = companies.some((company) => company.id === params.stockCompany)
      ? params.stockCompany
      : companies.find((company) => company.id === "warehousing")?.id ?? companies[0]?.id;
    if (requested) {
      desk = await loadInventoryDesk(requested, { canPostFinancial: canPostJournals(session) });
    }
  }

  return (
    <>
      <WorkDeskPage deskId="inventory" />
      {desk ? (
        <div className="mt-10">
          <InventoryStockDesk
            data={desk}
            companies={companies}
            canOperate={session ? canManageOperations(session) : false}
            canPostFinancial={session ? canPostJournals(session) : false}
            canViewValuation={session ? canViewAccounting(session) : false}
          />
        </div>
      ) : null}
    </>
  );
}
