import { and, desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { operationEntries, operations } from "@/db/schema";
import { resolveActivityTypeSlug } from "@/lib/create-operation-activity-type";
import { type OperationCreateInput } from "@/lib/operation-fields";
import { OPS_CODE_PREFIX, allocateNextCode } from "@/lib/organization-codes";
import { entryWithRelations } from "@/lib/create-operation-entry";
import { parseInputDate, todayInputDate } from "@/lib/utils";

const operationWithRelations = {
  organization: {
    columns: {
      id: true,
      name: true,
      orgCode: true,
      logoDriveFileId: true,
      phone: true,
      companyPhone: true,
      companyPhones: true,
      email: true,
      salesEmail: true,
    },
  },
  contact: {
    columns: { id: true, name: true, contactCode: true, mobiles: true, emails: true },
  },
  assignedTo: {
    columns: { id: true, name: true },
  },
  createdBy: {
    columns: { id: true, name: true },
  },
} as const;

export async function createOperationWithFirstEntry(
  input: OperationCreateInput & { openingBody?: string },
  createdById: string,
) {
  const operationId = crypto.randomUUID();
  const entryId = crypto.randomUUID();
  const now = new Date();
  const title = input.title.trim();
  const openingBody = input.openingBody?.trim() || title;
  const entryType = await resolveActivityTypeSlug(input.entryType ?? "note");

  return db.transaction(async (tx) => {
    const operationCode = await allocateNextCode(tx, OPS_CODE_PREFIX);

    await tx.insert(operations).values({
      id: operationId,
      operationCode,
      organizationId: input.organizationId?.trim() || null,
      contactId: input.contactId?.trim() || null,
      divisionId: input.divisionId,
      title,
      status: "active",
      assignedToId: input.assignedToId?.trim() || createdById,
      createdById,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(operationEntries).values({
      id: entryId,
      operationId,
      entryType,
      body: openingBody,
      status: "open",
      assignedToId: createdById,
      createdById,
      activityDate: parseInputDate(todayInputDate()),
      createdAt: now,
    });

    const operation = await tx.query.operations.findFirst({
      where: eq(operations.id, operationId),
      with: {
        ...operationWithRelations,
        entries: {
          orderBy: [
            desc(operationEntries.activityDate),
            desc(operationEntries.createdAt),
          ],
          with: entryWithRelations,
        },
      },
    });

    return operation;
  });
}

export async function getOperationById(operationId: string) {
  return db.query.operations.findFirst({
    where: eq(operations.id, operationId),
    with: {
      ...operationWithRelations,
      entries: {
        orderBy: [
          desc(operationEntries.activityDate),
          desc(operationEntries.createdAt),
        ],
        with: entryWithRelations,
      },
    },
  });
}

const relatedColumns = {
  id: true,
  operationCode: true,
  title: true,
  status: true,
  divisionId: true,
  updatedAt: true,
} as const;

const relatedWith = {
  organization: { columns: { name: true } },
  contact: { columns: { name: true, contactCode: true } },
} as const;

export type RelatedOperations = {
  reason: "person" | "company" | null;
  operations: Array<{
    id: string;
    operationCode: string;
    title: string;
    status: string;
    divisionId: string;
    updatedAt: Date;
    organization?: { name: string | null } | null;
    contact?: { name: string | null; contactCode: string } | null;
  }>;
};

export async function listRelatedOperations(input: {
  id: string;
  organizationId: string | null;
  contactId: string | null;
}): Promise<RelatedOperations> {
  if (input.contactId) {
    const samePerson = await db.query.operations.findMany({
      where: and(
        eq(operations.contactId, input.contactId),
        ne(operations.id, input.id),
      ),
      orderBy: [desc(operations.updatedAt)],
      limit: 6,
      columns: relatedColumns,
      with: relatedWith,
    });

    if (samePerson.length > 0) {
      return { reason: "person", operations: samePerson };
    }
  }

  if (input.organizationId) {
    const sameCompany = await db.query.operations.findMany({
      where: and(
        eq(operations.organizationId, input.organizationId),
        ne(operations.id, input.id),
      ),
      orderBy: [desc(operations.updatedAt)],
      limit: 6,
      columns: relatedColumns,
      with: relatedWith,
    });

    if (sameCompany.length > 0) {
      return { reason: "company", operations: sameCompany };
    }
  }

  return { reason: null, operations: [] };
}

export async function listPartyOperations(input: {
  organizationId?: string | null;
  contactId?: string | null;
}): Promise<RelatedOperations> {
  if (input.contactId) {
    const samePerson = await db.query.operations.findMany({
      where: eq(operations.contactId, input.contactId),
      orderBy: [desc(operations.updatedAt)],
      limit: 12,
      columns: relatedColumns,
      with: relatedWith,
    });

    if (samePerson.length > 0) {
      return { reason: "person", operations: samePerson };
    }
  }

  if (input.organizationId) {
    const sameCompany = await db.query.operations.findMany({
      where: eq(operations.organizationId, input.organizationId),
      orderBy: [desc(operations.updatedAt)],
      limit: 12,
      columns: relatedColumns,
      with: relatedWith,
    });

    if (sameCompany.length > 0) {
      return { reason: "company", operations: sameCompany };
    }
  }

  return { reason: null, operations: [] };
}
