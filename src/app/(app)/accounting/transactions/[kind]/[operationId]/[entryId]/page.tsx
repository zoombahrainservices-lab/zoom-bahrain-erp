import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BookSlipEditor } from "@/components/accounting/book-slip";
import { bookKindByEntryType, getBookKind, type BookSlipStage } from "@/lib/books-flow";
import { getOperationById } from "@/lib/create-operation";
import { getDivisionName } from "@/lib/operation-fields";
import { canManageOperations, canViewAccounting } from "@/lib/permissions";
import { getSession } from "@/lib/session";

function dateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function BookSlipPage({
  params,
}: {
  params: Promise<{ kind: string; operationId: string; entryId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewAccounting(session)) redirect("/dashboard");

  const { kind: kindId, operationId, entryId } = await params;
  const kind = getBookKind(kindId);
  if (!kind || kind.opens !== "slip") notFound();

  const operation = await getOperationById(operationId);
  const entry = operation?.entries?.find((item) => item.id === entryId);
  if (!operation || !entry || bookKindByEntryType(entry.entryType)?.id !== kind.id) {
    notFound();
  }
  if (!canManageOperations(session)) {
    redirect(kind.href);
  }

  const party =
    operation.organization?.name || operation.contact?.name || "No party";
  const stage = (kind.stages as readonly string[]).includes(entry.documentStage ?? "")
    ? (entry.documentStage as BookSlipStage)
    : "draft";
  const lines = [...(entry.lines ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line) => ({
      description: line.description,
      quantity: String(Number(line.quantity)),
      unitAmount: String(Number(line.unitAmount)),
    }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-secondary">
          <Link href={kind.href} className="font-medium text-heading">
            {kind.label}
          </Link>
          {" · "}
          <Link href={`/operations/${operation.id}`} className="font-medium text-heading">
            {operation.operationCode}
          </Link>
        </p>
        <h1 className="mt-1 text-xl font-semibold text-heading">
          {party}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {getDivisionName(operation.divisionId)}. {kind.blurb}
        </p>
      </div>
      <BookSlipEditor
        operationId={operation.id}
        entryId={entry.id}
        initialDate={dateInputValue(entry.activityDate)}
        initialBody={entry.body}
        initialStage={stage}
        initialLines={lines}
        stages={[...kind.stages]}
        convertTo={[...kind.convertTo]}
      />
    </div>
  );
}
