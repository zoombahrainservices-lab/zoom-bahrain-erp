import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ContactsPageClient } from "@/components/contacts-page-client";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { db } from "@/db";
import { organizationContacts } from "@/db/schema";
import { canManageContacts, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function ContactsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    return (
      <>
        <Heading>Contacts</Heading>
        <Text className="mt-4">
          The client login role does not have access to this section yet.
        </Text>
      </>
    );
  }

  const rows = await db.query.organizationContacts.findMany({
    where: eq(organizationContacts.status, "active"),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
    },
  });

  return (
    <>
      <Heading>Contacts</Heading>
      <Text className="mt-2">
        People. Companies belong in Organizations. Work happens on an operation.
      </Text>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <ContactsPageClient
            contacts={rows}
            isAdmin={canManageContacts(session)}
          />
        </Suspense>
      </div>
    </>
  );
}
