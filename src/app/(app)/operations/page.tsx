import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { OperationsPageClient } from "@/components/operations-page-client";
import { db } from "@/db";
import { operations } from "@/db/schema";
import { canAccessOperations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function OperationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    return (
      <>
        <Heading>Operations</Heading>
        <Text className="mt-4">
          The client login role does not have access to this section yet.
        </Text>
      </>
    );
  }

  if (!canAccessOperations(session)) {
    redirect("/dashboard");
  }

  const rows = await db.query.operations.findMany({
    orderBy: [desc(operations.updatedAt)],
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
      contact: {
        columns: { id: true, name: true, contactCode: true },
      },
      assignedTo: {
        columns: { id: true, name: true },
      },
      createdBy: {
        columns: { id: true, name: true },
      },
    },
  });

  return (
    <>
      <Heading>Operations</Heading>
      <Text className="mt-2">
        Work files for clients, staff, suppliers, and internal jobs.
      </Text>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
            <OperationsPageClient
              operations={rows}
              currentUserId={session.userId}
            />
        </Suspense>
      </div>
    </>
  );
}
