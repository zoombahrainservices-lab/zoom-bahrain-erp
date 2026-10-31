import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizationContacts } from "@/db/schema";
import { loadAccountingPage } from "@/lib/accounting/page";
import { partyLedger } from "@/lib/accounting/queries";
import { LedgerView } from "@/components/accounting/ledger-view";

export default async function ContactLedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ contactId: string }>;
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const { contactId } = await params;
  const page = await loadAccountingPage(await searchParams);
  const contact = await db.query.organizationContacts.findFirst({
    where: eq(organizationContacts.id, contactId),
    columns: { id: true, name: true, contactCode: true },
  });
  if (!contact) notFound();

  const lines = await partyLedger({
    filter: page.filter,
    contactId,
  });

  return (
    <LedgerView
      title={contact.name || "Contact"}
      code={contact.contactCode}
      lines={lines}
    />
  );
}
