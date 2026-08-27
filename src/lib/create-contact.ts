import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizationContacts, organizations } from "@/db/schema";
import {
  type ContactRegistrationInput,
  contactFormToDbValues,
} from "@/lib/contact-fields";
import { provisionContactDrive } from "@/lib/contact-drive";
import { CON_CODE_PREFIX, allocateNextCode } from "@/lib/organization-codes";
import {
  getNextContactSortOrder,
  syncOrganizationContactDenormalizedFields,
} from "@/lib/sync-organization-contacts";

export async function createContactWithCode(input: ContactRegistrationInput) {
  const created = await db.transaction(async (tx) => {
    if (input.organizationId) {
      const organization = await tx.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      if (!organization) {
        throw new Error("Organization not found");
      }
    }

    const contactCode = await allocateNextCode(tx, CON_CODE_PREFIX);
    const contactId = crypto.randomUUID();
    const values = contactFormToDbValues(input);
    const sortOrder = input.organizationId
      ? await getNextContactSortOrder(tx, input.organizationId)
      : 0;

    await tx.insert(organizationContacts).values({
      id: contactId,
      contactCode,
      organizationId: input.organizationId ?? null,
      sortOrder,
      ...values,
      status: input.status ?? "active",
    });

    if (input.organizationId) {
      await syncOrganizationContactDenormalizedFields(tx, input.organizationId);
    }

    return tx.query.organizationContacts.findFirst({
      where: eq(organizationContacts.id, contactId),
      with: {
        organization: {
          columns: { id: true, name: true, orgCode: true },
        },
      },
    });
  });

  if (created?.id && created.contactCode) {
    await provisionContactDrive({
      contactId: created.id,
      contactCode: created.contactCode,
    }).catch(() => {
      // Drive may not be connected yet.
    });
  }

  if (created?.id) {
    return db.query.organizationContacts.findFirst({
      where: eq(organizationContacts.id, created.id),
      with: {
        organization: {
          columns: { id: true, name: true, orgCode: true },
        },
      },
    });
  }

  return created;
}
