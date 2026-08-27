import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { driveFiles, operationEntries, operations, users } from "@/db/schema";
import { entryWithRelations } from "@/lib/create-operation-entry";
import {
  assertDocumentCanBeSent,
  documentLinesTotal,
  lineTotal,
} from "@/lib/operation-document-lines";
import { listDocumentLines } from "@/lib/create-operation-document-lines";
import {
  createGoogleDocFromHtml,
  deleteDriveFile,
  getWorkspaceDrive,
} from "@/lib/google";
import {
  areDocumentNumbersLocked,
  buildDocumentTemplateHtml,
  documentAmountLabel,
  documentFileName,
  GOOGLE_DOC_MIME,
  googleDocOnEntry,
  isCommercialDocumentType,
  type CommercialDocumentType,
} from "@/lib/operation-documents";
import { ensureOperationDriveFolder } from "@/lib/operation-drive";
import { getDivisionName, getOperationPartyLabel } from "@/lib/operation-fields";
import { formatBhd, formatDate } from "@/lib/utils";

function formatQty(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}

export async function generateCommercialDocument(options: {
  operationId: string;
  entryId: string;
  createdById: string;
  replace?: boolean;
}) {
  const entry = await db.query.operationEntries.findFirst({
    where: and(
      eq(operationEntries.id, options.entryId),
      eq(operationEntries.operationId, options.operationId),
    ),
    with: entryWithRelations,
  });

  if (!entry) {
    throw new Error("Entry not found");
  }

  if (!isCommercialDocumentType(entry.entryType)) {
    throw new Error("This entry is not a commercial document");
  }

  const existingDoc = googleDocOnEntry(entry);
  if (existingDoc && !options.replace) {
    return { entry, file: existingDoc, created: false as const };
  }

  if (
    existingDoc &&
    options.replace &&
    areDocumentNumbersLocked(entry.documentStage)
  ) {
    throw new Error(
      "This document was sent. Open the existing Google Doc instead of regenerating.",
    );
  }

  if (entry.entryType === "procurement" && !entry.vendorOrganizationId) {
    throw new Error("Choose a supplier before generating the Google Doc");
  }

  const connection = await getWorkspaceDrive();
  if (!connection) {
    throw new Error("Connect Google Drive in Settings to generate a Google Doc");
  }

  const storedLines = await listDocumentLines(entry.id);
  const usable = assertDocumentCanBeSent(
    storedLines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitAmount: Number(line.unitAmount),
    })),
  );

  const operation = await db.query.operations.findFirst({
    where: eq(operations.id, options.operationId),
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
      contact: {
        columns: { id: true, name: true, contactCode: true },
      },
    },
  });

  if (!operation) {
    throw new Error("Operation not found");
  }

  const preparedBy = await db.query.users.findFirst({
    where: eq(users.id, options.createdById),
    columns: { name: true },
  });

  const folderId = await ensureOperationDriveFolder({
    operationId: operation.id,
    operationCode: operation.operationCode,
    folderId: operation.driveFolderId,
  });

  const kind = entry.entryType as CommercialDocumentType;
  const total = documentLinesTotal(usable);
  const context = {
    kind,
    operationCode: operation.operationCode,
    operationTitle: operation.title,
    partyName: getOperationPartyLabel(operation),
    partyContactName: operation.contact?.name ?? operation.contact?.contactCode,
    vendorName: entry.vendorOrganization?.name ?? null,
    vendorContactName:
      entry.vendorContact?.name ?? entry.vendorContact?.contactCode ?? null,
    divisionName: getDivisionName(operation.divisionId),
    activityDate: formatDate(entry.activityDate),
    amountLabel: documentAmountLabel(kind),
    amountValue: formatBhd(total) || "BHD 0.000",
    lines: usable.map((line) => ({
      description: line.description,
      quantity: formatQty(line.quantity),
      unitAmount: formatBhd(line.unitAmount) || "BHD 0.000",
      total: formatBhd(lineTotal(line.quantity, line.unitAmount)) || "BHD 0.000",
    })),
    preparedBy: preparedBy?.name ?? "Zoom ERP",
  };

  if (existingDoc && options.replace) {
    const docs = (entry.files ?? []).filter(
      (file) => file.mimeType === GOOGLE_DOC_MIME,
    );
    for (const file of docs) {
      try {
        await deleteDriveFile(file.driveFileId);
      } catch {
        // Drive file may already be gone.
      }
      await db.delete(driveFiles).where(eq(driveFiles.id, file.id));
    }
  }

  const created = await createGoogleDocFromHtml({
    folderId,
    fileName: documentFileName(context),
    html: buildDocumentTemplateHtml(context),
  });

  if (!created.id) {
    throw new Error("Failed to create Google Doc");
  }

  const fileId = crypto.randomUUID();
  await db.insert(driveFiles).values({
    id: fileId,
    name: created.name ?? documentFileName(context),
    mimeType: created.mimeType ?? GOOGLE_DOC_MIME,
    size: created.size ? Number(created.size) : null,
    driveFileId: created.id,
    webViewLink: created.webViewLink ?? null,
    operationEntryId: options.entryId,
    uploadedById: options.createdById,
  });

  const updated = await db.query.operationEntries.findFirst({
    where: eq(operationEntries.id, options.entryId),
    with: entryWithRelations,
  });

  const file =
    updated?.files?.find((item) => item.id === fileId) ??
    googleDocOnEntry(updated ?? {}) ??
    null;

  return { entry: updated, file, created: true as const };
}
