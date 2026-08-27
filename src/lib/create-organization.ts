import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  organizationContacts,
  organizationIdentifiers,
  organizations,
} from "@/db/schema";
import {
  type OrganizationFormInput,
  type OrganizationTypeValue,
  organizationFormToDbValues,
  normalizeContactPeople,
} from "@/lib/organization-fields";
import {
  DEFAULT_COUNTRY_CODE,
  normalizeIdentifiers,
} from "@/lib/country-registration";
import {
  allocateNextCode,
  CON_CODE_PREFIX,
  ORG_CODE_PREFIX,
} from "@/lib/organization-codes";
import { syncOrganizationContactDenormalizedFields } from "@/lib/sync-organization-contacts";

export async function createOrganizationWithCodes(
  input: OrganizationFormInput & { roles?: OrganizationTypeValue[] },
) {
  const dbValues = organizationFormToDbValues(input);
  const contacts = normalizeContactPeople(input.contacts);
  const organizationId = crypto.randomUUID();

  return db.transaction(async (tx) => {
    const orgCode = await allocateNextCode(tx, ORG_CODE_PREFIX);

    await tx.insert(organizations).values({
      id: organizationId,
      orgCode,
      ...dbValues,
      clientContacts: null,
      assignedToId: null,
    });

    for (const [index, contact] of contacts.entries()) {
      const contactCode = await allocateNextCode(tx, CON_CODE_PREFIX);
      const contactId = crypto.randomUUID();

      await tx.insert(organizationContacts).values({
        id: contactId,
        contactCode,
        organizationId,
        sortOrder: index,
        name: contact.name || null,
        position: contact.position || null,
        mobiles:
          contact.mobiles.length > 0 ? JSON.stringify(contact.mobiles) : null,
        emails:
          contact.emails.length > 0 ? JSON.stringify(contact.emails) : null,
        status: "active",
      });
    }

    await syncOrganizationContactDenormalizedFields(tx, organizationId);

    const country = input.country?.trim().toUpperCase() || DEFAULT_COUNTRY_CODE;
    const identifiers = normalizeIdentifiers(input.identifiers, country);

    if (identifiers.length > 0) {
      await tx.insert(organizationIdentifiers).values(
        identifiers.map((identifier) => ({
          id: crypto.randomUUID(),
          organizationId,
          countryCode: country,
          identifierType: identifier.type,
          identifierLabel: identifier.label,
          identifierValue: identifier.value,
          isPrimary: identifier.isPrimary ? 1 : 0,
          issuingAuthority: identifier.issuingAuthority ?? null,
          expiryDate: identifier.expiryDate ?? null,
          sortOrder: identifier.sortOrder,
        })),
      );
    }

    return tx.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      with: {
        assignedTo: {
          columns: { id: true, name: true },
        },
        contacts: {
          orderBy: (people, { asc }) => [asc(people.sortOrder)],
        },
        identifiers: {
          orderBy: (rows, { asc }) => [asc(rows.sortOrder)],
        },
      },
    });
  });
}
