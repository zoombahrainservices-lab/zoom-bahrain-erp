import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { LedgerView } from "@/components/accounting/ledger-view";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { loadAccountingPage } from "@/lib/accounting/page";
import { partyLedger } from "@/lib/accounting/queries";

export default async function OrganizationLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const { organizationId } = await params;
  const page = await loadAccountingPage(await searchParams);
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { id: true, name: true, orgCode: true },
  });
  if (!organization) notFound();

  const lines = await partyLedger({
    filter: page.filter,
    organizationId,
  });

  return (
    <LedgerView
      title={organization.name}
      code={organization.orgCode}
      lines={lines}
    />
  );
}
