import { z } from "zod";

import {
  operationDocumentStages,
  operationEntryStatuses,
  operationStatuses,
  type OperationDocumentStage,
  type OperationEntryStatus,
  type OperationEntryType,
  type OperationStatus,
} from "@/db/schema";
import {
  defaultOperationActivityTypes,
  getActivityTypeLabel,
} from "@/lib/operation-activity-types";
import { divisions, getDivisionById } from "@/lib/divisions";

export type {
  OperationDocumentStage,
  OperationEntryStatus,
  OperationEntryType,
  OperationStatus,
} from "@/db/schema";

export const operationCreateSchema = z
  .object({
    organizationId: z.string().optional(),
    contactId: z.string().optional(),
    divisionId: z.string().min(1),
    title: z.string().trim().min(1, "Describe what this operation is about"),
    assignedToId: z.string().optional(),
    openingBody: z.string().optional(),
    entryType: z.string().optional(),
  })
  .superRefine((input, context) => {
    if (!input.organizationId?.trim() && !input.contactId?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Select an organization or a contact",
        path: ["organizationId"],
      });
    }

    if (!getDivisionById(input.divisionId)) {
      context.addIssue({
        code: "custom",
        message: "Select a valid division",
        path: ["divisionId"],
      });
    }
  });

export const operationUpdateSchema = z.object({
  status: z.enum(operationStatuses).optional(),
  title: z.string().trim().min(1).optional(),
  assignedToId: z.string().nullable().optional(),
});

export const operationEntryCreateSchema = z.object({
  entryType: z.string().trim().min(1, "Choose or type a type").max(60),
  body: z.string().optional(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
  parentEntryId: z.string().trim().min(1).optional(),
  amount: z.number().positive().optional(),
  unitAmountMultiplier: z.number().min(0).max(20).optional(),
  vendorOrganizationId: z.string().trim().min(1).nullable().optional(),
  vendorContactId: z.string().trim().min(1).nullable().optional(),
});

export const operationEntryUpdateSchema = z.object({
  body: z.string().optional(),
  status: z.enum(operationEntryStatuses).optional(),
  assignedToId: z.string().nullable().optional(),
  documentStage: z.enum(operationDocumentStages).optional(),
  vendorOrganizationId: z.string().trim().min(1).nullable().optional(),
  vendorContactId: z.string().trim().min(1).nullable().optional(),
});

export type OperationCreateInput = z.infer<typeof operationCreateSchema>;
export type OperationUpdateInput = z.infer<typeof operationUpdateSchema>;
export type OperationEntryCreateInput = z.infer<typeof operationEntryCreateSchema>;
export type OperationEntryUpdateInput = z.infer<typeof operationEntryUpdateSchema>;

export type OperationRecord = {
  id: string;
  operationCode: string;
  organizationId: string | null;
  contactId: string | null;
  divisionId: string;
  title: string;
  status: OperationStatus;
  assignedToId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  organization?: {
    id: string;
    name: string;
    orgCode: string | null;
    logoDriveFileId?: string | null;
    phone?: string | null;
    companyPhone?: string | null;
    companyPhones?: string | null;
    email?: string | null;
    salesEmail?: string | null;
  } | null;
  contact?: {
    id: string;
    name: string | null;
    contactCode: string;
    mobiles?: string | null;
    emails?: string | null;
  } | null;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  entries?: OperationEntryRecord[];
};

export type OperationEntryRecord = {
  id: string;
  operationId: string;
  entryType: OperationEntryType;
  body: string;
  status: OperationEntryStatus;
  assignedToId: string | null;
  createdById: string;
  activityDate: Date;
  createdAt: Date;
  documentStage?: OperationDocumentStage | null;
  parentEntryId?: string | null;
  amount?: string | null;
  issuedOn?: string | null;
  dueOn?: string | null;
  paymentTerms?: string;
  taxVersion?: number;
  vendorOrganizationId?: string | null;
  vendorContactId?: string | null;
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
  } | null;
  vendorOrganization?: {
    id: string;
    name: string;
    orgCode: string | null;
  } | null;
  vendorContact?: {
    id: string;
    name: string | null;
    contactCode: string;
  } | null;
  files?: OperationEntryFileRecord[];
  lines?: {
    id: string;
    description: string;
    quantity: string;
    unitAmount: string;
    discount?: string;
    vatCodeId?: string | null;
    sortOrder: number;
  }[];
};

export type OperationEntryFileRecord = {
  id: string;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  createdAt: Date;
  uploadedBy?: {
    name: string;
  } | null;
};

export const operationEntryTypeOptions = defaultOperationActivityTypes.map(
  (type) => ({
    value: type.slug,
    label: type.label,
    moneyKind: type.moneyKind,
  }),
);

export function resolveEntryType(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "note";

  const match = operationEntryTypeOptions.find(
    (option) =>
      option.value.toLowerCase() === trimmed.toLowerCase() ||
      option.label.toLowerCase() === trimmed.toLowerCase(),
  );

  return match?.value ?? trimmed;
}

export function getEntryTypeLabel(
  entryType: string,
  types?: { slug: string; label: string }[],
) {
  if (types?.length) {
    return getActivityTypeLabel(entryType, types);
  }

  return getActivityTypeLabel(entryType);
}

export function getOperationPartyLabel(operation: {
  organization?: { name?: string | null } | null;
  contact?: { name?: string | null; contactCode?: string | null } | null;
}) {
  if (operation.organization?.name) {
    return operation.organization.name;
  }
  if (operation.contact?.name) {
    return operation.contact.name;
  }
  return operation.contact?.contactCode ?? "Unknown";
}

export function getDivisionLabel(divisionId: string) {
  return getDivisionById(divisionId)?.acronym ?? divisionId.toUpperCase();
}

export function getDivisionName(divisionId: string) {
  return getDivisionById(divisionId)?.name ?? divisionId;
}


export function getOperationStatusLabel(status: OperationStatus) {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

export const divisionOptions = divisions.map((division) => ({
  id: division.id,
  acronym: division.acronym,
  name: division.name,
  logo: division.logo,
  internal: Boolean(division.internal),
}));
