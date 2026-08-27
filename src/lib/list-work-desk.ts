import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { operationEntries, operations, organizationContacts, tasks } from "@/db/schema";
import { moneyEntryTypes, type WorkDesk } from "@/lib/work-desks";

const operationListWith = {
  organization: {
    columns: { id: true, name: true, orgCode: true },
  },
  contact: {
    columns: { id: true, name: true, contactCode: true },
  },
  assignedTo: {
    columns: { id: true, name: true },
  },
} as const;

const entryListWith = {
  operation: {
    columns: {
      id: true,
      operationCode: true,
      title: true,
      divisionId: true,
    },
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
      contact: {
        columns: { id: true, name: true, contactCode: true },
      },
    },
  },
} as const;

export async function listDeskOperations(desk: WorkDesk) {
  const divisionIds = desk.list.divisionIds;
  return db.query.operations.findMany({
    ...(divisionIds?.length
      ? { where: inArray(operations.divisionId, divisionIds) }
      : {}),
    orderBy: [desc(operations.updatedAt)],
    limit: 40,
    with: operationListWith,
  });
}

export async function listDeskEntries(entryTypes: string[]) {
  if (entryTypes.length === 0) return [];

  return db.query.operationEntries.findMany({
    where: inArray(operationEntries.entryType, entryTypes),
    orderBy: [
      desc(operationEntries.activityDate),
      desc(operationEntries.createdAt),
    ],
    limit: 40,
    with: entryListWith,
  });
}

export async function listDeskTasks() {
  return db.query.tasks.findMany({
    orderBy: [desc(tasks.updatedAt)],
    limit: 40,
    with: {
      operation: {
        columns: { id: true, operationCode: true, title: true },
      },
      assignedTo: {
        columns: { id: true, name: true },
      },
    },
  });
}

export async function listDeskMoney() {
  return listDeskEntries([...moneyEntryTypes]);
}

export async function listDeskPeople() {
  return db.query.organizationContacts.findMany({
    where: (table, { eq }) => eq(table.status, "active"),
    orderBy: [desc(organizationContacts.createdAt)],
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
    },
  });
}

export async function listActiveOperations() {
  return db.query.operations.findMany({
    where: eq(operations.status, "active"),
    orderBy: [desc(operations.updatedAt)],
    limit: 80,
    columns: {
      id: true,
      operationCode: true,
      title: true,
      status: true,
      divisionId: true,
      createdAt: true,
    },
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
      contact: {
        columns: { id: true, name: true, contactCode: true },
      },
    },
  });
}

export async function listPartyOptions() {
  const [organizationRows, contactRows] = await Promise.all([
    db.query.organizations.findMany({
      columns: { id: true, name: true, orgCode: true },
      orderBy: (table, { asc }) => [asc(table.name)],
    }),
    db.query.organizationContacts.findMany({
      where: (table, { eq }) => eq(table.status, "active"),
      columns: { id: true, name: true, contactCode: true, organizationId: true },
      with: {
        organization: {
          columns: { name: true },
        },
      },
      orderBy: (table, { asc }) => [asc(table.name)],
    }),
  ]);

  return {
    organizations: organizationRows,
    contacts: contactRows,
  };
}
