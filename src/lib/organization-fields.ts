import { z } from "zod";

import { organizationTypes, organizationStatuses } from "@/db/schema";
import {
  DEFAULT_COUNTRY_CODE,
  identifiersForCountry,
  identifiersFromLegacyColumns,
  legacyRegistrationFromIdentifiers,
  normalizeIdentifiers,
  type OrganizationIdentifierInput,
  type OrganizationIdentifierRow,
  validateRequiredIdentifiers,
} from "@/lib/country-registration";

const optionalString = z.string().optional();
const contactList = z.array(z.string()).optional();

export const organizationTypeOptions = [
  { value: "client", label: "Client" },
  { value: "supplier", label: "Supplier" },
  { value: "partner", label: "Partner" },
  { value: "government_entity", label: "Government Entity" },
  { value: "venue", label: "Venue" },
  { value: "sponsor", label: "Sponsor" },
  { value: "landlord", label: "Landlord" },
  { value: "tenant", label: "Tenant" },
  { value: "financial_institution", label: "Financial Institution" },
  { value: "carrier", label: "Carrier" },
] as const;

/** @deprecated Use organizationTypeOptions */
export const organizationRoleOptions = organizationTypeOptions;

export type OrganizationTypeValue =
  (typeof organizationTypeOptions)[number]["value"];

/** @deprecated Use OrganizationTypeValue */
export type OrganizationRoleValue = OrganizationTypeValue;

const labeledEmailSchema = z.object({
  label: z.string(),
  email: z.string().default(""),
});

const labeledEmailList = z.array(labeledEmailSchema).optional();

const organizationContactSchema = z.object({
  name: z.string().default(""),
  position: z.string().default(""),
  mobiles: contactList,
  emails: labeledEmailList,
});

export const companyEmailLabelOptions = [
  { value: "sales", label: "Sales" },
  { value: "admin", label: "Admin" },
  { value: "general", label: "General" },
  { value: "accounts", label: "Accounts" },
  { value: "support", label: "Support" },
  { value: "other", label: "Other" },
] as const;

export const contactEmailLabelOptions = [
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
] as const;

export type LabeledEmail = {
  label: string;
  email: string;
};

export type OrganizationContactPerson = {
  id?: string;
  code?: string;
  orgCode?: string;
  name: string;
  position: string;
  mobiles: string[];
  emails: LabeledEmail[];
  notes?: string;
};

export type OrganizationContactPersonRow = {
  id: string;
  contactCode: string;
  organizationId: string | null;
  sortOrder: number;
  name: string | null;
  position: string | null;
  mobiles: string | null;
  emails: string | null;
  status?: string;
  notes?: string | null;
  createdAt: Date;
};

const identifierInputSchema = z.object({
  type: z.string(),
  label: z.string().default(""),
  value: z.string().default(""),
  isPrimary: z.boolean().optional(),
  issuingAuthority: z.string().optional(),
  expiryDate: z.string().optional(),
});

export const organizationFormSchema = z.object({
  name: z.string().min(1, "Legal company name is required"),
  natureOfBusiness: optionalString,
  registeredAddress: optionalString,
  country: z.string().min(1, "Country of registration is required"),
  identifiers: z.array(identifierInputSchema).optional(),
  companyPhones: contactList,
  website: optionalString,
  companyEmails: labeledEmailList,
  contacts: z.array(organizationContactSchema).optional(),
  status: z.enum(organizationStatuses).optional(),
  notes: optionalString,
});

export const organizationEvaluationSchema = z.object({
  roles: z
    .array(z.enum(organizationTypes))
    .min(1, "Select at least one organization type"),
});

export const organizationUpdateSchema = z
  .object({
    roles: z
      .array(z.enum(organizationTypes))
      .min(1, "Select at least one organization type")
      .optional(),
    country: z.string().optional(),
  })
  .refine(
    (value) => value.roles !== undefined || value.country !== undefined,
    { message: "Nothing to update" },
  );

export type OrganizationEvaluationInput = z.infer<
  typeof organizationEvaluationSchema
>;

export const organizationRegistrationSchema = organizationFormSchema
  .extend({
    roles: z
      .array(z.enum(organizationTypes))
      .min(1, "Select at least one organization type"),
    status: z.enum(organizationStatuses).optional(),
  })
  .superRefine((value, ctx) => {
    const identifierError = validateRequiredIdentifiers(
      value.country,
      value.identifiers,
    );
    if (identifierError) {
      ctx.addIssue({
        code: "custom",
        path: ["identifiers"],
        message: identifierError,
      });
    }
  });

export type OrganizationRegistrationInput = z.infer<
  typeof organizationRegistrationSchema
>;

export type OrganizationFormInput = z.infer<typeof organizationFormSchema>;

export function emptyContactPerson(): OrganizationContactPerson {
  return {
    name: "",
    position: "",
    mobiles: [""],
    emails: [{ label: "work", email: "" }],
  };
}

export const emptyOrganizationForm: OrganizationFormInput = {
  name: "",
  natureOfBusiness: "",
  registeredAddress: "",
  country: DEFAULT_COUNTRY_CODE,
  identifiers: identifiersForCountry(DEFAULT_COUNTRY_CODE),
  companyPhones: [""],
  website: "",
  companyEmails: [{ label: "sales", email: "" }],
  contacts: [emptyContactPerson()],
  notes: "",
};

export type OrganizationWizardInput = OrganizationFormInput & {
  roles: OrganizationTypeValue[];
};

export const emptyOrganizationWizard: OrganizationWizardInput = {
  ...emptyOrganizationForm,
  roles: [],
};

export function getContactHeading(index: number) {
  if (index === 0) return "Primary contact";
  return `Contact ${index + 1}`;
}

export function parseOrganizationTypes(
  value: string | OrganizationTypeValue[] | null | undefined,
): OrganizationTypeValue[] {
  if (Array.isArray(value)) {
    return value.filter((type): type is OrganizationTypeValue =>
      organizationTypes.includes(type as OrganizationTypeValue),
    );
  }

  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (type): type is OrganizationTypeValue =>
          typeof type === "string" &&
          organizationTypes.includes(type as OrganizationTypeValue),
      );
    }
  } catch {
    // Fall back to unevaluated org.
  }

  return [];
}

/** @deprecated Use parseOrganizationTypes */
export const parseOrganizationRoles = parseOrganizationTypes;

export function serializeOrganizationTypes(types: OrganizationTypeValue[]) {
  const normalized = types.filter((type) =>
    organizationTypes.includes(type as OrganizationTypeValue),
  );
  return JSON.stringify(normalized);
}

/** @deprecated Use serializeOrganizationTypes */
export const serializeOrganizationRoles = serializeOrganizationTypes;

export function formatOrganizationTypes(
  types: OrganizationTypeValue[] | string | null | undefined,
) {
  const parsed = Array.isArray(types) ? types : parseOrganizationTypes(types);
  if (parsed.length === 0) return "Pending evaluation";

  return parsed
    .map(
      (type) =>
        organizationTypeOptions.find((option) => option.value === type)?.label ??
        type,
    )
    .join(" + ");
}

export function hasOrganizationTypes(
  roles: OrganizationTypeValue[] | string | null | undefined,
) {
  const types = Array.isArray(roles)
    ? roles
    : parseOrganizationTypes(roles);
  return types.length > 0;
}

/** @deprecated Use formatOrganizationTypes */
export const formatOrganizationRoles = formatOrganizationTypes;

function trimOrNull(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeContactList(values: string[] | undefined) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export function normalizeLabeledEmails(values: LabeledEmail[] | undefined) {
  return (values ?? [])
    .map((entry) => ({
      label: entry.label.trim() || "other",
      email: entry.email.trim(),
    }))
    .filter((entry) => entry.email.length > 0);
}

export function normalizeContactPerson(
  contact: OrganizationContactPerson,
): OrganizationContactPerson {
  return {
    name: contact.name.trim(),
    position: contact.position.trim(),
    mobiles: normalizeContactList(contact.mobiles),
    emails: normalizeLabeledEmails(contact.emails),
  };
}

export function isContactPersonEmpty(contact: OrganizationContactPerson) {
  const normalized = normalizeContactPerson(contact);
  return (
    !normalized.name &&
    normalized.mobiles.length === 0 &&
    normalized.emails.length === 0
  );
}

export function normalizeContactPeople(
  values: OrganizationFormInput["contacts"],
): OrganizationContactPerson[] {
  return (values ?? [])
    .map((contact) =>
      normalizeContactPerson({
        name: contact.name ?? "",
        position: contact.position ?? "",
        mobiles: contact.mobiles ?? [""],
        emails: contact.emails ?? [{ label: "work", email: "" }],
      }),
    )
    .filter((contact) => !isContactPersonEmpty(contact));
}

export function parseContactList(
  json: string | null | undefined,
  fallback: string | null | undefined,
) {
  if (json) {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean);
      }
    } catch {
      // Fall back to legacy single-value column.
    }
  }

  const legacy = fallback?.trim();
  return legacy ? [legacy] : [];
}

export function getEmailLabelDisplayName(
  label: string,
  options: readonly { value: string; label: string }[],
) {
  return options.find((option) => option.value === label)?.label ?? label;
}

export function formatLabeledEmail(
  entry: LabeledEmail,
  options: readonly { value: string; label: string }[],
) {
  return `${getEmailLabelDisplayName(entry.label, options)}: ${entry.email}`;
}

export function parseLabeledEmailList(
  json: string | null | undefined,
  legacy: {
    salesEmail?: string | null;
    adminEmail?: string | null;
    singleEmail?: string | null;
  },
  defaultLabel: string,
): LabeledEmail[] {
  if (json) {
    try {
      const parsed = JSON.parse(json) as unknown;
      if (Array.isArray(parsed)) {
        const entries = parsed
          .map((item): LabeledEmail | null => {
            if (typeof item === "string") {
              const email = item.trim();
              return email ? { label: defaultLabel, email } : null;
            }
            if (
              item &&
              typeof item === "object" &&
              "email" in item &&
              typeof item.email === "string"
            ) {
              const email = item.email.trim();
              if (!email) return null;
              const label =
                "label" in item && typeof item.label === "string" && item.label
                  ? item.label
                  : defaultLabel;
              return { label, email };
            }
            return null;
          })
          .filter((entry): entry is LabeledEmail => entry !== null);

        if (entries.length > 0) return entries;
      }
    } catch {
      // Fall back to legacy columns.
    }
  }

  const fromLegacy: LabeledEmail[] = [];
  if (legacy.salesEmail?.trim()) {
    fromLegacy.push({ label: "sales", email: legacy.salesEmail.trim() });
  }
  if (legacy.adminEmail?.trim()) {
    fromLegacy.push({ label: "admin", email: legacy.adminEmail.trim() });
  }
  if (fromLegacy.length > 0) return fromLegacy;

  const single = legacy.singleEmail?.trim();
  return single ? [{ label: defaultLabel, email: single }] : [];
}

function legacyContactPersonFromRecord(
  client: OrganizationRecord,
  kind: "primary" | "secondary",
): OrganizationContactPerson | null {
  if (kind === "primary") {
    const contact: OrganizationContactPerson = {
      name: client.primaryContactName?.trim() ?? "",
      position: client.primaryContactPosition?.trim() ?? "",
      mobiles: parseContactList(
        client.primaryContactMobiles,
        client.primaryContactMobile,
      ),
      emails: parseLabeledEmailList(
        client.primaryContactEmails,
        { singleEmail: client.primaryContactEmail },
        "work",
      ),
    };
    return isContactPersonEmpty(contact) ? null : contact;
  }

  const contact: OrganizationContactPerson = {
    name: client.secondaryContactName?.trim() ?? "",
    position: client.secondaryContactPosition?.trim() ?? "",
    mobiles: parseContactList(
      client.secondaryContactMobiles,
      client.secondaryContactMobile,
    ),
    emails: parseLabeledEmailList(
      client.secondaryContactEmails,
      { singleEmail: null },
      "work",
    ),
  };
  return isContactPersonEmpty(contact) ? null : contact;
}

export function parseOrganizationContacts(
  organization: OrganizationRecord,
): OrganizationContactPerson[] {
  if (organization.contacts !== undefined) {
    return organization.contacts.map((row) => {
      const contact = normalizeContactPerson({
        name: row.name ?? "",
        position: row.position ?? "",
        mobiles: parseContactList(row.mobiles, null),
        emails: parseLabeledEmailList(row.emails, {}, "work"),
      });

      return {
        ...contact,
        id: row.id,
        code: row.contactCode,
        orgCode: organization.orgCode ?? undefined,
        notes: row.notes?.trim() || undefined,
      };
    });
  }

  if (organization.clientContacts) {
    try {
      const parsed = JSON.parse(organization.clientContacts) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const contacts = parsed
          .map((item): OrganizationContactPerson | null => {
            if (!item || typeof item !== "object") return null;

            const name =
              "name" in item && typeof item.name === "string" ? item.name : "";
            const position =
              "position" in item && typeof item.position === "string"
                ? item.position
                : "";
            const id =
              "id" in item && typeof item.id === "string" ? item.id : undefined;
            const code =
              "code" in item && typeof item.code === "string" ? item.code : undefined;
            const orgCode =
              "orgCode" in item && typeof item.orgCode === "string"
                ? item.orgCode
                : organization.orgCode ?? undefined;
            const notes =
              "notes" in item && typeof item.notes === "string"
                ? item.notes.trim() || undefined
                : undefined;

            let mobiles: string[] = [];
            if ("mobiles" in item && Array.isArray(item.mobiles)) {
              mobiles = (item.mobiles as unknown[]).filter(
                (value): value is string => typeof value === "string",
              );
            } else if (
              "mobile" in item &&
              typeof item.mobile === "string" &&
              item.mobile.trim()
            ) {
              mobiles = [item.mobile];
            }

            let emails: LabeledEmail[] = [];
            if ("emails" in item && Array.isArray(item.emails)) {
              emails = (item.emails as unknown[])
                .map((entry): LabeledEmail | null => {
                  if (!entry || typeof entry !== "object") return null;
                  if (!("email" in entry) || typeof entry.email !== "string") {
                    return null;
                  }
                  const email = entry.email.trim();
                  if (!email) return null;
                  const label =
                    "label" in entry &&
                    typeof entry.label === "string" &&
                    entry.label
                      ? entry.label
                      : "work";
                  return { label, email };
                })
                .filter((entry): entry is LabeledEmail => entry !== null);
            }

            const contact = normalizeContactPerson({
              name,
              position,
              mobiles,
              emails,
            });
            if (isContactPersonEmpty(contact)) return null;
            return { ...contact, id, code, orgCode, notes };
          })
          .filter((contact): contact is OrganizationContactPerson => contact !== null);

        if (contacts.length > 0) return contacts;
      }
    } catch {
      // Fall back to legacy primary/secondary columns.
    }
  }

  const legacyContacts = [
    legacyContactPersonFromRecord(organization, "primary"),
    legacyContactPersonFromRecord(organization, "secondary"),
  ].filter((contact): contact is OrganizationContactPerson => contact !== null);

  return legacyContacts;
}

export function legacyFieldsFromContactPerson(
  contact: OrganizationContactPerson | undefined,
) {
  if (!contact) {
    return {
      name: null,
      position: null,
      mobile: null,
      mobiles: null,
      email: null,
      emails: null,
    };
  }

  const normalized = normalizeContactPerson(contact);

  return {
    name: normalized.name || null,
    position: normalized.position || null,
    mobile: normalized.mobiles[0] ?? null,
    mobiles:
      normalized.mobiles.length > 0
        ? JSON.stringify(normalized.mobiles)
        : null,
    email: normalized.emails[0]?.email ?? null,
    emails:
      normalized.emails.length > 0
        ? JSON.stringify(normalized.emails)
        : null,
  };
}

export function organizationFormToDbValues(
  input: OrganizationFormInput & { roles?: OrganizationTypeValue[] },
) {
  const companyPhones = normalizeContactList(input.companyPhones);
  const companyEmails = normalizeLabeledEmails(input.companyEmails);
  const contacts = normalizeContactPeople(input.contacts);
  const country = input.country?.trim().toUpperCase() || DEFAULT_COUNTRY_CODE;
  const identifiers = normalizeIdentifiers(input.identifiers, country);
  const legacyIdentifiers = legacyRegistrationFromIdentifiers(identifiers);
  const primary = legacyFieldsFromContactPerson(contacts[0]);
  const secondary = legacyFieldsFromContactPerson(contacts[1]);

  const salesEmail =
    companyEmails.find((entry) => entry.label === "sales")?.email ??
    companyEmails[0]?.email ??
    null;
  const adminEmail =
    companyEmails.find((entry) => entry.label === "admin")?.email ?? null;

  return {
    name: input.name.trim(),
    roles: serializeOrganizationTypes(input.roles ?? []),
    company: null,
    email: salesEmail ?? primary.email ?? null,
    phone: companyPhones[0] ?? primary.mobile ?? null,
    natureOfBusiness: trimOrNull(input.natureOfBusiness),
    tradingGroupName: null,
    commercialRegistration: legacyIdentifiers.commercialRegistration,
    vatAccountNumber: legacyIdentifiers.vatAccountNumber,
    registeredAddress: trimOrNull(input.registeredAddress),
    country,
    companyPhone: companyPhones[0] ?? null,
    companyPhones:
      companyPhones.length > 0 ? JSON.stringify(companyPhones) : null,
    website: trimOrNull(input.website),
    salesEmail,
    adminEmail,
    companyEmails:
      companyEmails.length > 0 ? JSON.stringify(companyEmails) : null,
    clientContacts:
      contacts.length > 0 ? JSON.stringify(contacts) : null,
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
    status: input.status ?? "lead",
    notes: trimOrNull(input.notes),
  };
}

export type OrganizationRecord = {
  id: string;
  orgCode: string | null;
  roles: string | OrganizationRoleValue[] | null;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  natureOfBusiness: string | null;
  tradingGroupName: string | null;
  commercialRegistration: string | null;
  vatAccountNumber: string | null;
  registeredAddress: string | null;
  country: string | null;
  companyPhone: string | null;
  companyPhones: string | null;
  website: string | null;
  salesEmail: string | null;
  adminEmail: string | null;
  companyEmails: string | null;
  clientContacts: string | null;
  contacts?: OrganizationContactPersonRow[];
  identifiers?: OrganizationIdentifierRow[];
  primaryContactName: string | null;
  primaryContactPosition: string | null;
  primaryContactMobile: string | null;
  primaryContactEmail: string | null;
  primaryContactMobiles: string | null;
  primaryContactEmails: string | null;
  secondaryContactName: string | null;
  secondaryContactPosition: string | null;
  secondaryContactMobile: string | null;
  secondaryContactMobiles: string | null;
  secondaryContactEmails: string | null;
  status: string;
  notes: string | null;
  driveFolderId: string | null;
  logoDriveFileId: string | null;
  logoMimeType: string | null;
  createdAt: Date;
};

export function getOrganizationTypes(organization: OrganizationRecord) {
  return parseOrganizationTypes(organization.roles);
}

/** @deprecated Use getOrganizationTypes */
export const getOrganizationRoles = getOrganizationTypes;

export function getCompanyPhones(client: OrganizationRecord) {
  return parseContactList(
    client.companyPhones,
    client.companyPhone ?? client.phone,
  );
}

export function getCompanyEmails(client: OrganizationRecord) {
  return parseLabeledEmailList(
    client.companyEmails,
    {
      salesEmail: client.salesEmail,
      adminEmail: client.adminEmail,
      singleEmail: client.email,
    },
    "general",
  );
}

export function getOrganizationContacts(organization: OrganizationRecord) {
  return parseOrganizationContacts(organization);
}

export function getOrganizationIdentifiers(organization: OrganizationRecord) {
  if (organization.identifiers?.length) {
    return organization.identifiers
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row): OrganizationIdentifierInput => ({
        type: row.identifierType,
        label: row.identifierLabel,
        value: row.identifierValue,
        isPrimary: row.isPrimary === 1,
        issuingAuthority: row.issuingAuthority ?? undefined,
        expiryDate: row.expiryDate ?? undefined,
      }));
  }

  return identifiersFromLegacyColumns(organization).filter((item) =>
    item.value.trim(),
  );
}

export function getPrimaryContactMobiles(client: OrganizationRecord) {
  return parseContactList(
    client.primaryContactMobiles,
    client.primaryContactMobile,
  );
}

export function getPrimaryContactEmails(client: OrganizationRecord) {
  return parseLabeledEmailList(
    client.primaryContactEmails,
    { singleEmail: client.primaryContactEmail },
    "work",
  );
}

export function getSecondaryContactMobiles(client: OrganizationRecord) {
  return parseContactList(
    client.secondaryContactMobiles,
    client.secondaryContactMobile,
  );
}

export function getSecondaryContactEmails(client: OrganizationRecord) {
  return parseLabeledEmailList(
    client.secondaryContactEmails,
    { singleEmail: null },
    "work",
  );
}
