import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { OrganizationsPageClient } from "@/components/organizations-page-client";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { canManageOrganizations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function OrganizationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    return (
      <>
        <Heading>Organizations</Heading>
        <Text className="mt-4">
          The client login role does not have access to this section yet.
        </Text>
      </>
    );
  }

  const rows = await db.query.organizations.findMany({
    where: eq(organizations.status, "active"),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      contacts: {
        orderBy: (people, { asc }) => [asc(people.sortOrder)],
      },
      identifiers: {
        orderBy: (rows, { asc }) => [asc(rows.sortOrder)],
      },
    },
  });

  return (
    <>
      <Heading>Organizations</Heading>
      <Text className="mt-2">
        Companies. People belong in Contacts. Work happens on an operation.
      </Text>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <OrganizationsPageClient
            organizations={rows}
            isAdmin={canManageOrganizations(session)}
          />
        </Suspense>
      </div>
    </>
  );
}
