import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { operationEntries, operations, organizations } from "@/db/schema";
import { allowedCompanyIds } from "@/lib/accounting/phase3";
import { copyDocumentLines, listDocumentLines } from "@/lib/create-operation-document-lines";
import { createOperationWithFirstEntry } from "@/lib/create-operation";
import { createOperationEntry } from "@/lib/create-operation-entry";
import { getDivisionById } from "@/lib/divisions";
import {
  bookSlipHref,
  getBookKind,
  isBookSlipType,
  type BookKind,
} from "@/lib/books-flow";
import { commercialDocumentPath } from "@/lib/operation-documents";
import { todayInputDate } from "@/lib/utils";

export class BookFlowError extends Error {}

export async function startBookTransaction(
  input: {
    kind: string;
    organizationId?: string;
    divisionId?: string;
    operationId?: string;
    parentEntryId?: string;
    note?: string;
  },
  actor: { userId: string; role: string },
) {
  const kind = getBookKind(input.kind);
  if (!kind?.entryType) {
    throw new BookFlowError("Choose a sale, estimate, order, delivery, return, or procurement");
  }

  const note = input.note?.trim() || kind.label;
  let operationId = input.operationId?.trim() || "";

  if (operationId) {
    const operation = await db.query.operations.findFirst({
      where: eq(operations.id, operationId),
      columns: { id: true, divisionId: true },
    });
    if (!operation) throw new BookFlowError("That file was not found");
    await assertCompanyAllowed(operation.divisionId, actor);
  } else {
    const organizationId = input.organizationId?.trim() || "";
    const divisionId = input.divisionId?.trim() || "";
    if (!organizationId || !divisionId) {
      throw new BookFlowError("Choose a company and a party");
    }
    if (!getDivisionById(divisionId)) throw new BookFlowError("Choose a company");
    await assertCompanyAllowed(divisionId, actor);

    const party = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: { id: true, name: true },
    });
    if (!party) throw new BookFlowError("That party was not found");

    const created = await createOperationWithFirstEntry(
      {
        organizationId,
        divisionId,
        title: `${kind.label} · ${party.name}`,
        entryType: "note",
        openingBody: note,
      },
      actor.userId,
    );
    if (!created) throw new BookFlowError("Could not open a file for this party");
    operationId = created.id;
  }

  const entry = await createOperationEntry(
    operationId,
    {
      entryType: kind.entryType,
      body: note,
      activityDate: todayInputDate(),
      parentEntryId: input.parentEntryId?.trim() || undefined,
    },
    actor.userId,
  );
  if (!entry) throw new BookFlowError("Could not open that transaction");

  if (isBookSlipType(kind.entryType)) {
    if (!entry.documentStage) {
      await db
        .update(operationEntries)
        .set({ documentStage: "draft" })
        .where(eq(operationEntries.id, entry.id));
    }
    if (input.parentEntryId?.trim()) {
      const existingLines = await listDocumentLines(entry.id);
      if (existingLines.length === 0) {
        await copyDocumentLines(input.parentEntryId.trim(), entry.id);
      }
    }
  }

  return {
    operationId,
    entryId: entry.id,
    href: destinationHref(kind, operationId, entry.id),
  };
}

function destinationHref(kind: BookKind, operationId: string, entryId: string) {
  if (kind.opens === "document") return commercialDocumentPath(operationId, entryId);
  return bookSlipHref(kind.id, operationId, entryId);
}

async function assertCompanyAllowed(companyId: string, actor: { userId: string; role: string }) {
  const allowed = await allowedCompanyIds(actor.userId, actor.role);
  if (allowed !== "all" && !allowed.includes(companyId)) {
    throw new BookFlowError("You cannot use that company");
  }
}

export async function listBookSlips(entryType: string) {
  return db.query.operationEntries.findMany({
    where: eq(operationEntries.entryType, entryType),
    orderBy: [desc(operationEntries.activityDate), desc(operationEntries.createdAt)],
    limit: 200,
    with: {
      operation: {
        columns: { id: true, operationCode: true, title: true, divisionId: true },
        with: {
          organization: { columns: { name: true } },
          contact: { columns: { name: true } },
        },
      },
    },
  });
}
