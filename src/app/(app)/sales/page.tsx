import { Suspense } from "react";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { SalesPageClient } from "@/components/sales-page-client";
import { db } from "@/db";
import { salesInquiries } from "@/db/schema";
import { inquiryDetailWith } from "@/lib/convert-inquiry";
import {
  canAccessSales,
  canManageInquiries,
  canManageOrganizations,
  isClientUser,
} from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function SalesPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    return (
      <>
        <Heading>Sales</Heading>
        <Text className="mt-4">
          The client login role does not have access to this section yet.
        </Text>
      </>
    );
  }

  if (!canAccessSales(session)) {
    redirect("/dashboard");
  }

  const rows = await db.query.salesInquiries.findMany({
    orderBy: [desc(salesInquiries.createdAt)],
    with: inquiryDetailWith,
  });

  return (
    <>
      <Heading>Sales</Heading>
      <Text className="mt-2">
        Log incoming enquiries here. Open one as an operation to do the work.
      </Text>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <SalesPageClient
            initialInquiries={rows}
            canConvert={canManageInquiries(session)}
            canConvertToOrganization={canManageOrganizations(session)}
          />
        </Suspense>
      </div>
    </>
  );
}
