import { notFound, redirect } from "next/navigation";

import { CommercialDocumentEditor } from "@/components/commercial-document-editor";
import { getOperationById } from "@/lib/create-operation";
import { getWorkspaceDrive } from "@/lib/google";
import { isCommercialDocumentType } from "@/lib/operation-documents";
import { getDivisionName, getOperationPartyLabel } from "@/lib/operation-fields";
import { canAccessOperations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { listVatCodes } from "@/lib/accounting/queries";
import { loadBillTo } from "@/lib/commercial-print-data";

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
  const operation = await getOperationById(id);
  if (!operation) {
    notFound();
  }
  const [workspaceDrive, vatCodes, billTo] = await Promise.all([
    getWorkspaceDrive(),
    listVatCodes(operation.divisionId),
    loadBillTo(id),
  ]);

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
      billTo={billTo}
      vatCodes={vatCodes
        .filter((code) => code.companyId === operation.divisionId)
        .map((code) => ({
          id: code.id,
          code: code.code,
          name: code.name,
          rate: code.rate,
          treatment: code.treatment,
        }))}
    />
  );
}
