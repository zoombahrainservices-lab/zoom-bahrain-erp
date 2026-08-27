import { z } from "zod";

import { inquiryStatuses } from "@/db/schema";

const optionalString = z.string().optional();

export const inquiryCreateSchema = z
  .object({
    name: optionalString,
    phone: optionalString,
    email: optionalString,
    subject: optionalString,
  })
  .superRefine((input, context) => {
    const phone = input.phone?.trim() ?? "";
    const email = input.email?.trim() ?? "";
    const name = input.name?.trim() ?? "";

    if (!phone && !email && !name) {
      context.addIssue({
        code: "custom",
        message: "Enter at least a phone number, email, or name",
        path: ["phone"],
      });
    }
  });

export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;

export const inquiryUpdateSchema = z.object({
  name: optionalString,
  phone: optionalString,
  email: optionalString,
  subject: optionalString,
  status: z.enum(inquiryStatuses).optional(),
});

export type InquiryUpdateInput = z.infer<typeof inquiryUpdateSchema>;

export type InquiryRecord = {
  id: string;
  inquiryCode: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  subject: string | null;
  status: string;
  convertedContactId: string | null;
  convertedOrganizationId: string | null;
  convertedOperationId?: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; name: string } | null;
  convertedContact?: {
    id: string;
    contactCode: string;
    name: string | null;
  } | null;
  convertedOrganization?: {
    id: string;
    orgCode: string | null;
    name: string;
  } | null;
  convertedOperation?: {
    id: string;
    operationCode: string;
    title: string;
  } | null;
};

export function inquiryToDbValues(input: InquiryCreateInput) {
  return {
    name: input.name?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    subject: input.subject?.trim() || null,
  };
}

export function getInquiryDisplayName(inquiry: InquiryRecord) {
  return inquiry.name?.trim() || inquiry.phone?.trim() || inquiry.email?.trim() || "Unknown caller";
}

export function contactNameFromInquiry(inquiry: InquiryRecord) {
  return getInquiryDisplayName(inquiry);
}

export function inquiryToOrganizationWizardPrefill(inquiry: InquiryRecord) {
  const contactName = inquiry.name?.trim() || "";
  const companyName = inquiry.name?.trim() || "New organization";

  return {
    name: companyName,
    notes: inquiry.subject?.trim() || "",
    contacts: [
      {
        name: contactName,
        position: "",
        mobiles: inquiry.phone?.trim() ? [inquiry.phone.trim()] : [""],
        emails: inquiry.email?.trim()
          ? [{ label: "work", email: inquiry.email.trim() }]
          : [{ label: "work", email: "" }],
      },
    ],
  };
}
