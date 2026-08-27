import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizationContacts, organizations } from "@/db/schema";
import {
  type OrganizationContactPerson,
  legacyFieldsFromContactPerson,
  normalizeContactPerson,
  parseContactList,
  parseLabeledEmailList,
} from "@/lib/organization-fields";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function contactRowToStoredContact(
  row: {
    id: string;
    contactCode: string;
    name: string | null;
    position: string | null;
    mobiles: string | null;
    emails: string | null;
    notes: string | null;
  },
  orgCode: string | null,
): OrganizationContactPerson & { code: string; orgCode: string } {
  const normalized = normalizeContactPerson({
    name: row.name ?? "",
    position: row.position ?? "",
    mobiles: parseContactList(row.mobiles, null),
    emails: parseLabeledEmailList(row.emails, {}, "work"),
  });

  return {
    ...normalized,
    id: row.id,
    code: row.contactCode,
    orgCode: orgCode ?? "",
    notes: row.notes?.trim() || undefined,
  };
}

export async function getNextContactSortOrder(
  tx: DbTransaction,
  organizationId: string,
) {
  const rows = await tx.query.organizationContacts.findMany({
    where: eq(organizationContacts.organizationId, organizationId),
    columns: { sortOrder: true },
  });

  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

export async function syncOrganizationContactDenormalizedFields(
  tx: DbTransaction,
  organizationId: string,
) {
  const org = await tx.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { id: true, orgCode: true },
  });

  if (!org) return;

  const rows = await tx.query.organizationContacts.findMany({
    where: eq(organizationContacts.organizationId, organizationId),
    orderBy: [
      asc(organizationContacts.sortOrder),
      asc(organizationContacts.createdAt),
    ],
  });

  const storedContacts = rows.map((row) =>
    contactRowToStoredContact(row, org.orgCode),
  );

  const primary = legacyFieldsFromContactPerson(storedContacts[0]);
  const secondary = legacyFieldsFromContactPerson(storedContacts[1]);

  await tx
    .update(organizations)
    .set({
      clientContacts:
        storedContacts.length > 0 ? JSON.stringify(storedContacts) : null,
      primaryContactName: primary.name,
      primaryContactPosition: primary.position,
      primaryContactMobile: primary.mobile,
      primaryContactEmail: primary.email,
      primaryContactMobiles: primary.mobiles,
      primaryContactEmails: primary.emails,
      secondaryContactName: secondary.name,
      secondaryContactPosition: secondary.position,
      secondaryContactMobile: secondary.mobile,
      secondaryContactMobiles: secondary.mobiles,
      secondaryContactEmails: secondary.emails,
    })
    .where(eq(organizations.id, organizationId));
}
