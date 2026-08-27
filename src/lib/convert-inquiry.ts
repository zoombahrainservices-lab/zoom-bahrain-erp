import { eq } from "drizzle-orm";

import { db } from "@/db";
import { salesInquiries } from "@/db/schema";
import { createContactWithCode } from "@/lib/create-contact";
import { createOperationWithFirstEntry } from "@/lib/create-operation";
import { getDivisionById } from "@/lib/divisions";
import {
  type InquiryRecord,
  contactNameFromInquiry,
  getInquiryDisplayName,
} from "@/lib/inquiry-fields";

export const inquiryDetailWith = {
  createdBy: {
    columns: { id: true, name: true },
  },
  convertedContact: {
    columns: { id: true, contactCode: true, name: true },
  },
  convertedOrganization: {
    columns: { id: true, orgCode: true, name: true },
  },
  convertedOperation: {
    columns: { id: true, operationCode: true, title: true },
  },
} as const;

export async function loadInquiry(inquiryId: string) {
  return db.query.salesInquiries.findFirst({
    where: eq(salesInquiries.id, inquiryId),
    with: inquiryDetailWith,
  });
}

function openingBodyFromInquiry(inquiry: {
  inquiryCode: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  subject: string | null;
}) {
  return [
    inquiry.subject?.trim() || "Sales enquiry",
    inquiry.name ? `Caller: ${inquiry.name}` : null,
    inquiry.phone ? `Phone: ${inquiry.phone}` : null,
    inquiry.email ? `Email: ${inquiry.email}` : null,
    `Inquiry ${inquiry.inquiryCode}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function convertInquiryToContact(inquiryId: string) {
  const inquiry = await db.query.salesInquiries.findFirst({
    where: eq(salesInquiries.id, inquiryId),
  });

  if (!inquiry) {
    throw new Error("Inquiry not found");
  }

  if (inquiry.convertedContactId) {
    return loadInquiry(inquiryId);
  }

  const contact = await createContactWithCode({
    name: contactNameFromInquiry(inquiry as InquiryRecord),
    mobiles: inquiry.phone?.trim() ? [inquiry.phone.trim()] : undefined,
    emails: inquiry.email?.trim()
      ? [{ label: "work", email: inquiry.email.trim() }]
      : undefined,
    notes: inquiry.subject?.trim() || undefined,
    status: "active",
  });

  if (!contact?.id) {
    throw new Error("Failed to create contact");
  }

  await db
    .update(salesInquiries)
    .set({
      convertedContactId: contact.id,
      updatedAt: new Date(),
    })
    .where(eq(salesInquiries.id, inquiryId));

  return loadInquiry(inquiryId);
}

export async function convertInquiryToOperation(options: {
  inquiryId: string;
  createdById: string;
  divisionId?: string;
  organizationId?: string | null;
  contactId?: string | null;
}) {
  const inquiry = await db.query.salesInquiries.findFirst({
    where: eq(salesInquiries.id, options.inquiryId),
  });

  if (!inquiry) {
    throw new Error("Inquiry not found");
  }

  if (inquiry.convertedOperationId) {
    const existing = await loadInquiry(options.inquiryId);
    return { inquiry: existing, created: false as const };
  }

  const divisionId =
    options.divisionId && getDivisionById(options.divisionId)
      ? options.divisionId
      : "group";

  let contactId =
    options.contactId?.trim() || inquiry.convertedContactId || null;
  const organizationId =
    options.organizationId?.trim() || inquiry.convertedOrganizationId || null;

  if (!contactId && !organizationId) {
    const created = await convertInquiryToContact(options.inquiryId);
    contactId = created?.convertedContactId ?? null;
  }

  if (!contactId && !organizationId) {
    throw new Error("Could not attach a contact or organization");
  }

  const title =
    inquiry.subject?.trim() ||
    `Enquiry from ${getInquiryDisplayName(inquiry as InquiryRecord)}`;

  const operation = await createOperationWithFirstEntry(
    {
      organizationId: organizationId ?? undefined,
      contactId: contactId ?? undefined,
      divisionId,
      title,
      assignedToId: options.createdById,
      openingBody: openingBodyFromInquiry(inquiry),
    },
    options.createdById,
  );

  if (!operation?.id) {
    throw new Error("Failed to create operation");
  }

  await db
    .update(salesInquiries)
    .set({
      status: "converted",
      convertedContactId: contactId,
      convertedOrganizationId: organizationId,
      convertedOperationId: operation.id,
      updatedAt: new Date(),
    })
    .where(eq(salesInquiries.id, options.inquiryId));

  const updated = await loadInquiry(options.inquiryId);
  return { inquiry: updated, operation, created: true as const };
}

export async function markInquiryConvertedToOrganization(
  inquiryId: string,
  organizationId: string,
  createdById: string,
) {
  const inquiry = await db.query.salesInquiries.findFirst({
    where: eq(salesInquiries.id, inquiryId),
  });

  if (!inquiry) return null;

  await db
    .update(salesInquiries)
    .set({
      convertedOrganizationId: organizationId,
      updatedAt: new Date(),
    })
    .where(eq(salesInquiries.id, inquiryId));

  const result = await convertInquiryToOperation({
    inquiryId,
    createdById,
    organizationId,
  });

  return result;
}
