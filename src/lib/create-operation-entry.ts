import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { operationEntries, operations, tasks } from "@/db/schema";
import { resolveActivityTypeSlug } from "@/lib/create-operation-activity-type";
import { copyDocumentLines } from "@/lib/create-operation-document-lines";
import { type OperationEntryCreateInput } from "@/lib/operation-fields";
import { isCommercialDocumentType } from "@/lib/operation-documents";
import { parseInputDate, todayInputDate } from "@/lib/utils";

export const entryWithRelations = {
  assignedTo: {
    columns: { id: true, name: true },
  },
  createdBy: {
    columns: { id: true, name: true },
  },
  files: {
    with: {
      uploadedBy: {
        columns: { name: true },
      },
    },
  },
  lines: true,
  vendorOrganization: {
    columns: { id: true, name: true, orgCode: true },
  },
  vendorContact: {
    columns: { id: true, name: true, contactCode: true },
  },
} as const;

export async function createOperationEntry(
  operationId: string,
  input: OperationEntryCreateInput,
  createdById: string,
) {
  const entryId = crypto.randomUUID();
  const now = new Date();
  const activityDate = parseInputDate(input.activityDate ?? todayInputDate());
  const entryType = await resolveActivityTypeSlug(input.entryType);
  const isDocument = isCommercialDocumentType(entryType);
  const parentEntryId = input.parentEntryId?.trim() || null;
  let vendorOrganizationId = input.vendorOrganizationId?.trim() || null;
  let vendorContactId = input.vendorContactId?.trim() || null;

  if (parentEntryId) {
    const existingChild = await db.query.operationEntries.findFirst({
      where: and(
        eq(operationEntries.operationId, operationId),
        eq(operationEntries.parentEntryId, parentEntryId),
        eq(operationEntries.entryType, entryType),
      ),
      with: entryWithRelations,
    });

    if (existingChild) {
      return existingChild;
    }

    const parent = await db.query.operationEntries.findFirst({
      where: eq(operationEntries.id, parentEntryId),
      columns: {
        entryType: true,
        vendorOrganizationId: true,
        vendorContactId: true,
      },
    });

    if (parent && !vendorOrganizationId && entryType === "procurement") {
      vendorOrganizationId = parent.vendorOrganizationId;
      vendorContactId = parent.vendorContactId;
    }
  }

  await db.insert(operationEntries).values({
    id: entryId,
    operationId,
    entryType,
    body: input.body?.trim() ?? "",
    status: "open",
    assignedToId: createdById,
    createdById,
    activityDate,
    documentStage: isDocument ? "draft" : null,
    parentEntryId,
    amount: input.amount !== undefined ? input.amount.toFixed(3) : null,
    vendorOrganizationId,
    vendorContactId,
    createdAt: now,
  });

  if (isDocument && parentEntryId) {
    await copyDocumentLines(parentEntryId, entryId, {
      unitAmountMultiplier: input.unitAmountMultiplier,
    });
  }

  if (entryType === "task") {
    const operation = await db.query.operations.findFirst({
      where: eq(operations.id, operationId),
      columns: { organizationId: true, assignedToId: true },
    });
    const title = (input.body?.trim() || "To-do").slice(0, 200);
    const nowTask = new Date();
    await db.insert(tasks).values({
      id: crypto.randomUUID(),
      title,
      description: null,
      status: "todo",
      priority: "medium",
      dueDate: null,
      organizationId: operation?.organizationId ?? null,
      operationId,
      operationEntryId: entryId,
      assignedToId: operation?.assignedToId ?? createdById,
      createdById,
      createdAt: nowTask,
      updatedAt: nowTask,
    });
  }

  return db.query.operationEntries.findFirst({
    where: eq(operationEntries.id, entryId),
    with: entryWithRelations,
  });
}

export async function listOperationEntries(operationId: string) {
  return db.query.operationEntries.findMany({
    where: eq(operationEntries.operationId, operationId),
    orderBy: [
      desc(operationEntries.activityDate),
      desc(operationEntries.createdAt),
    ],
    with: entryWithRelations,
  });
}
