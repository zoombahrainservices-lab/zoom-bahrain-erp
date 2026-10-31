import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { operationEntries } from "@/db/schema";
import { getDivisionById, getDivisionName } from "@/lib/divisions";

import { postDocumentToLedger, reverseDocumentJournal } from "./engine";
import { assertProcurementMayPost, postTaxedInvoice } from "./phase3";
import { AccountingError } from "./money";

const invoicePosted = new Set(["sent", "overdue", "paid"]);
const billPosted = new Set(["received", "priced"]);

export async function syncCommercialDocumentAccounting(input: {
  operationId: string;
  entryId: string;
  previousStage: string | null;
  nextStage: string;
  actorId: string;
}) {
  if (input.previousStage === input.nextStage) return;

  const entry = await db.query.operationEntries.findFirst({
    where: and(
      eq(operationEntries.id, input.entryId),
      eq(operationEntries.operationId, input.operationId),
    ),
    with: { operation: true },
  });
  if (!entry?.operation) return;
  if (entry.entryType !== "invoice" && entry.entryType !== "procurement") return;

  const companyId = entry.operation.divisionId;
  if (!getDivisionById(companyId)) {
    throw new AccountingError("This operation has no Zoom company");
  }

  const posted =
    entry.entryType === "invoice" ? invoicePosted : billPosted;
  const wasPosted = Boolean(input.previousStage && posted.has(input.previousStage));
  const isPosted = posted.has(input.nextStage);

  if (wasPosted && !isPosted) {
    await reverseDocumentJournal({
      companyId,
      sourceType: entry.entryType,
      entryId: entry.id,
      actorId: input.actorId,
    });
    return;
  }

  if (!isPosted || wasPosted) return;

  const organizationId =
    entry.entryType === "invoice"
      ? entry.operation.organizationId
      : entry.vendorOrganizationId;
  const contactId =
    entry.entryType === "invoice"
      ? entry.operation.contactId
      : entry.vendorContactId;

  if (entry.entryType === "invoice" && entry.taxVersion === 1) {
    await postTaxedInvoice({
      companyId,
      entryId: entry.id,
      operationId: entry.operation.id,
      entryDate: formatLedgerDate(entry.activityDate),
      description: `Invoice ${entry.operation.operationCode} · ${getDivisionName(companyId)}`,
      organizationId,
      contactId,
      actorId: input.actorId,
    });
    return;
  }

  await postDocumentToLedger({
    companyId,
    entryId: entry.id,
    operationId: entry.operation.id,
    entryDate: formatLedgerDate(entry.activityDate),
    amount: entry.amount ?? "0",
    description: `${entry.entryType === "invoice" ? "Invoice" : "Purchase bill"} ${entry.operation.operationCode} · ${getDivisionName(companyId)}`,
    sourceType: entry.entryType,
    debitCode: entry.entryType === "invoice" ? "1100" : "5600",
    creditCode: entry.entryType === "invoice" ? "4000" : "2000",
    organizationId,
    contactId,
    actorId: input.actorId,
    guard:
      entry.entryType === "procurement"
        ? async (tx) => {
            await assertProcurementMayPost({ companyId, entryId: entry.id, tx });
          }
        : undefined,
  });
}

function formatLedgerDate(value: Date | string) {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
