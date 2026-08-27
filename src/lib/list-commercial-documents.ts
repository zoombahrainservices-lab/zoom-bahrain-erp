import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { operationEntries } from "@/db/schema";
import type { CommercialDocumentType } from "@/lib/operation-documents";

export async function listCommercialDocuments(kind: CommercialDocumentType) {
  return db.query.operationEntries.findMany({
    where: eq(operationEntries.entryType, kind),
    orderBy: [
      desc(operationEntries.activityDate),
      desc(operationEntries.createdAt),
    ],
    with: {
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
          assignedTo: {
            columns: { id: true, name: true },
          },
        },
      },
      vendorOrganization: {
        columns: { id: true, name: true, orgCode: true },
      },
      vendorContact: {
        columns: { id: true, name: true, contactCode: true },
      },
    },
  });
}

export type CommercialDocumentListRow = Awaited<
  ReturnType<typeof listCommercialDocuments>
>[number];
