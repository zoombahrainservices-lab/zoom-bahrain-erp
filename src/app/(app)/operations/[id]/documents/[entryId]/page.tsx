import { notFound, redirect } from "next/navigation";

import { CommercialDocumentEditor } from "@/components/commercial-document-editor";
import { getOperationById } from "@/lib/create-operation";
import { getWorkspaceDrive } from "@/lib/google";
import { isCommercialDocumentType } from "@/lib/operation-documents";
import { getDivisionName, getOperationPartyLabel } from "@/lib/operation-fields";
import { canAccessOperations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

type CommercialDocumentPageProps = {
  params: Promise<{ id: string; entryId: string }>;
};

export default async function CommercialDocumentPage({
  params,
}: CommercialDocumentPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/operations");
  }

  if (!canAccessOperations(session)) {
    redirect("/dashboard");
  }

  const { id, entryId } = await params;
  const [operation, workspaceDrive] = await Promise.all([
    getOperationById(id),
    getWorkspaceDrive(),
  ]);

  if (!operation) {
    notFound();
  }

  const entry = operation.entries?.find((item) => item.id === entryId);
  if (!entry || !isCommercialDocumentType(entry.entryType)) {
    notFound();
  }

  return (
    <CommercialDocumentEditor
      operation={operation}
      partyName={getOperationPartyLabel(operation)}
      divisionName={getDivisionName(operation.divisionId)}
      entry={entry}
      driveConnected={Boolean(workspaceDrive)}
    />
  );
}
