import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BookStartForm } from "@/components/accounting/book-start-form";
import { getBookKind } from "@/lib/books-flow";
import { loadAccountingPage } from "@/lib/accounting/page";
import { listOrganizations } from "@/lib/accounting/queries";
import { listActiveOperations } from "@/lib/list-work-desk";
import { canManageOperations } from "@/lib/permissions";

export default async function BookStartPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind: kindId } = await params;
  const kind = getBookKind(kindId);
  if (!kind?.entryType) notFound();

  const page = await loadAccountingPage({});
  if (!canManageOperations(page.session)) {
    redirect(kind.href);
  }

  const [parties, operations] = await Promise.all([
    listOrganizations(),
    listActiveOperations(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-secondary">
          <Link href={kind.href} className="font-medium text-heading">
            {kind.label}
          </Link>
        </p>
        <h1 className="mt-1 text-xl font-semibold text-heading">New {kind.label.toLowerCase()}</h1>
      </div>
      {parties.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Add a party first.{" "}
          <Link href="/organizations/new" className="font-medium text-heading">
            New party
          </Link>
        </p>
      ) : (
        <BookStartForm
          kind={kind}
          companies={page.companies}
          parties={parties.map((party) => ({ id: party.id, name: party.name }))}
          operations={operations.map((operation) => ({
            id: operation.id,
            divisionId: operation.divisionId,
            organizationId: operation.organization?.id ?? "",
            label: `${operation.operationCode} · ${operation.organization?.name || operation.contact?.name || operation.title}`,
          }))}
        />
      )}
    </div>
  );
}
