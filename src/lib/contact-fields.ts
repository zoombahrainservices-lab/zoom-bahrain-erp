import { z } from "zod";

import { contactKinds, organizationStatuses, type ContactKind } from "@/db/schema";
import {
  type LabeledEmail,
  contactEmailLabelOptions,
  normalizeContactPerson,
  parseContactList,
  parseLabeledEmailList,
} from "@/lib/organization-fields";

const optionalString = z.string().optional();
const contactList = z.array(z.string()).optional();

const labeledEmailSchema = z.object({
  label: z.string(),
  email: z.string().default(""),
});

const labeledEmailList = z.array(labeledEmailSchema).optional();

export const contactRegistrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  position: optionalString,
  mobiles: contactList,
  emails: labeledEmailList,
  notes: optionalString,
  status: z.enum(organizationStatuses).optional(),
  organizationId: z.string().optional(),
  kinds: z.array(z.enum(contactKinds)).optional(),
});

export type ContactRegistrationInput = z.infer<typeof contactRegistrationSchema>;

export const contactUpdateSchema = contactRegistrationSchema
  .partial()
  .extend({
    organizationId: z.string().nullable().optional(),
  });

export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

export type ContactOrganizationSummary = {
  id: string;
  name: string;
  orgCode: string | null;
};

export type ContactRecord = {
  id: string;
  contactCode: string;
  organizationId: string | null;
  sortOrder: number;
  name: string | null;
  position: string | null;
  mobiles: string | null;
  emails: string | null;
  status: string;
  notes: string | null;
  kinds?: string | null;
  driveFolderId: string | null;
  createdAt: Date;
  organization?: ContactOrganizationSummary | null;
};

export type ContactFormInput = {
  name: string;
  position: string;
  mobiles: string[];
  emails: LabeledEmail[];
  notes: string;
  kinds: ContactKind[];
};

export const contactKindOptions: Array<{ value: ContactKind; label: string }> = [
  { value: "staff", label: "Staff" },
  { value: "candidate", label: "Candidate" },
  { value: "contractor", label: "Contractor" },
];

export function parseContactKinds(value: unknown): ContactKind[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is ContactKind =>
      (contactKinds as readonly string[]).includes(item),
    );
  }

  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return parseContactKinds(parsed);
  } catch {
    return [];
  }
}

export function getContactKinds(contact: Pick<ContactRecord, "kinds">) {
  return parseContactKinds(contact.kinds);
}

export function formatContactKinds(kinds: ContactKind[]) {
  return kinds
    .map(
      (kind) =>
        contactKindOptions.find((option) => option.value === kind)?.label ?? kind,
    )
    .join(" · ");
}

export function emptyContactForm(): ContactFormInput {
  return {
    name: "",
    position: "",
    mobiles: [""],
    emails: [{ label: "work", email: "" }],
    notes: "",
    kinds: [],
  };
}

export function contactRecordToForm(contact: ContactRecord): ContactFormInput {
  return {
    name: contact.name ?? "",
    position: contact.position ?? "",
    mobiles: getContactMobiles(contact).length
      ? getContactMobiles(contact)
      : [""],
    emails: getContactEmails(contact).length
      ? getContactEmails(contact)
      : [{ label: "work", email: "" }],
    notes: contact.notes ?? "",
    kinds: getContactKinds(contact),
  };
}

export function contactFormToDbValues(input: ContactRegistrationInput) {
  const normalized = normalizeContactPerson({
    name: input.name ?? "",
    position: input.position ?? "",
    mobiles: input.mobiles ?? [""],
    emails: input.emails ?? [{ label: "work", email: "" }],
  });

  return {
    name: normalized.name || null,
    position: normalized.position || null,
    mobiles:
      normalized.mobiles.length > 0 ? JSON.stringify(normalized.mobiles) : null,
    emails:
      normalized.emails.length > 0 ? JSON.stringify(normalized.emails) : null,
    notes: input.notes?.trim() || null,
    kinds: JSON.stringify(parseContactKinds(input.kinds)),
  };
}

export function getContactMobiles(contact: ContactRecord) {
  return parseContactList(contact.mobiles, null);
}

export function getContactEmails(contact: ContactRecord) {
  return parseLabeledEmailList(contact.emails, {}, "work");
}

export function getContactDisplayName(contact: ContactRecord) {
  return contact.name?.trim() || "Unnamed contact";
}

export const ALLOWED_CONTACT_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function isAllowedContactImageMimeType(mimeType: string) {
  return ALLOWED_CONTACT_IMAGE_TYPES.has(mimeType);
}

export { contactEmailLabelOptions };
