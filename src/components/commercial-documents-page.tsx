import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CommercialDocumentListClient } from "@/components/commercial-document-list-client";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { listCommercialDocuments } from "@/lib/list-commercial-documents";
import {
  commercialListPages,
  type CommercialDocumentType,
} from "@/lib/operation-documents";
import { canAccessOperations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export async function CommercialDocumentsPage({
  kind,
}: {
  kind: CommercialDocumentType;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const page = commercialListPages.find((item) => item.kind === kind);
  const title = page?.title ?? kind;
  const blurb = page?.blurb ?? "";

  if (isClientUser(session)) {
    return (
      <>
        <Heading>{title}</Heading>
        <Text className="mt-4">
          The client login role does not have access to this section yet.
        </Text>
      </>
    );
  }

  if (!canAccessOperations(session)) {
    redirect("/dashboard");
  }

  const items = await listCommercialDocuments(kind);

  return (
    <>
      <Heading>{title}</Heading>
      <Text className="mt-2">{blurb}</Text>
      {kind === "invoice" ? (
        <Text className="mt-2">
          <Link href="/accounting/sales" className="font-medium text-zoom-dark">
            Open the Sale Invoices ledger
          </Link>
        </Text>
      ) : null}
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <CommercialDocumentListClient kind={kind} items={items} />
        </Suspense>
      </div>
    </>
  );
}
