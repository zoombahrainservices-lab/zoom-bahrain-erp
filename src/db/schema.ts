import { relations, sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoles = ["admin", "employee", "client"] as const;

export const organizationStatuses = ["lead", "active", "inactive"] as const;
export const organizationTypes = [
  "client",
  "supplier",
  "partner",
  "government_entity",
  "venue",
  "sponsor",
  "landlord",
  "tenant",
  "financial_institution",
  "carrier",
] as const;

/** @deprecated Use organizationTypes */
export const organizationRoles = organizationTypes;

export const taskStatuses = ["todo", "in_progress", "review", "done"] as const;

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;

export const inquiryStatuses = ["open", "converted", "closed"] as const;

export const operationStatuses = ["active", "completed", "cancelled"] as const;

export const operationEntryTypes = [
  "task",
  "proposal",
  "quotation",
  "invoice",
  "meeting",
  "recurring",
  "note",
  "request",
  "incident",
  "document",
  "cost",
  "procurement",
  "other",
] as const;

export const operationEntryStatuses = ["open", "done"] as const;

export const operationDocumentStages = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "revised",
  "paid",
  "overdue",
  "cancelled",
  "received",
  "priced",
] as const;

export const operationActivityMoneyKinds = ["none", "in", "out"] as const;

export const contactKinds = ["staff", "candidate", "contractor"] as const;

export type UserRole = (typeof userRoles)[number];
export type OrganizationStatus = (typeof organizationStatuses)[number];
export type OrganizationType = (typeof organizationTypes)[number];
/** @deprecated Use OrganizationType */
export type OrganizationRole = OrganizationType;
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type InquiryStatus = (typeof inquiryStatuses)[number];
export type OperationStatus = (typeof operationStatuses)[number];
export type OperationEntryType = string;
export type OperationEntryStatus = (typeof operationEntryStatuses)[number];
export type OperationDocumentStage = (typeof operationDocumentStages)[number];
export type OperationActivityMoneyKind =
  (typeof operationActivityMoneyKinds)[number];
export type ContactKind = (typeof contactKinds)[number];

/** @deprecated Use OrganizationStatus */
export type ClientStatus = OrganizationStatus;

/** @deprecated Use organizationStatuses */
export const clientStatuses = organizationStatuses;

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<UserRole>().notNull().default("employee"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  orgCode: text("org_code").unique(),
  roles: text("roles").notNull().default("[]"),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  natureOfBusiness: text("nature_of_business"),
  tradingGroupName: text("trading_group_name"),
  commercialRegistration: text("commercial_registration"),
  vatAccountNumber: text("vat_account_number"),
  registeredAddress: text("registered_address"),
  country: text("country"),
  companyPhone: text("company_phone"),
  companyPhones: text("company_phones"),
  website: text("website"),
  salesEmail: text("sales_email"),
  adminEmail: text("admin_email"),
  companyEmails: text("company_emails"),
  clientContacts: text("client_contacts"),
  primaryContactName: text("primary_contact_name"),
  primaryContactPosition: text("primary_contact_position"),
  primaryContactMobile: text("primary_contact_mobile"),
  primaryContactEmail: text("primary_contact_email"),
  primaryContactMobiles: text("primary_contact_mobiles"),
  primaryContactEmails: text("primary_contact_emails"),
  secondaryContactName: text("secondary_contact_name"),
  secondaryContactPosition: text("secondary_contact_position"),
  secondaryContactMobile: text("secondary_contact_mobile"),
  secondaryContactMobiles: text("secondary_contact_mobiles"),
  secondaryContactEmails: text("secondary_contact_emails"),
  status: text("status").$type<OrganizationStatus>().notNull().default("lead"),
  notes: text("notes"),
  driveFolderId: text("drive_folder_id"),
  logoDriveFileId: text("logo_drive_file_id"),
  logoMimeType: text("logo_mime_type"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/** @deprecated Use organizations */
export const clients = organizations;

export const organizationIdentifiers = pgTable("organization_identifiers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  countryCode: text("country_code"),
  identifierType: text("identifier_type").notNull(),
  identifierLabel: text("identifier_label").notNull(),
  identifierValue: text("identifier_value").notNull(),
  isPrimary: integer("is_primary").notNull().default(0),
  issuingAuthority: text("issuing_authority"),
  expiryDate: text("expiry_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const codeSequences = pgTable("code_sequences", {
  prefix: text("prefix").primaryKey(),
  nextValue: integer("next_value").notNull().default(1),
});

export const organizationContacts = pgTable("organization_contacts", {
  id: text("id").primaryKey(),
  contactCode: text("contact_code").notNull().unique(),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  sortOrder: integer("sort_order").notNull().default(0),
  name: text("name"),
  position: text("position"),
  mobiles: text("mobiles"),
  emails: text("emails"),
  status: text("status").$type<OrganizationStatus>().notNull().default("active"),
  notes: text("notes"),
  about: text("about"),
  kinds: text("kinds").notNull().default("[]"),
  driveFolderId: text("drive_folder_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/** @deprecated Use organizationContacts */
export const clientContactPeople = organizationContacts;

export const salesInquiries = pgTable("sales_inquiries", {
  id: text("id").primaryKey(),
  inquiryCode: text("inquiry_code").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  subject: text("subject"),
  status: text("status").$type<InquiryStatus>().notNull().default("open"),
  convertedContactId: text("converted_contact_id").references(
    () => organizationContacts.id,
    { onDelete: "set null" },
  ),
  convertedOrganizationId: text("converted_organization_id").references(
    () => organizations.id,
    { onDelete: "set null" },
  ),
  convertedOperationId: text("converted_operation_id").references(
    () => operations.id,
    { onDelete: "set null" },
  ),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const operations = pgTable("operations", {
  id: text("id").primaryKey(),
  operationCode: text("operation_code").notNull().unique(),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  contactId: text("contact_id").references(() => organizationContacts.id, {
    onDelete: "set null",
  }),
  divisionId: text("division_id").notNull().default("group"),
  title: text("title").notNull().default(""),
  status: text("status").$type<OperationStatus>().notNull().default("active"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  driveFolderId: text("drive_folder_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const operationActivityTypes = pgTable("operation_activity_types", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  moneyKind: text("money_kind")
    .$type<OperationActivityMoneyKind>()
    .notNull()
    .default("none"),
  sortOrder: integer("sort_order").notNull().default(100),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const operationEntries = pgTable("operation_entries", {
  id: text("id").primaryKey(),
  operationId: text("operation_id")
    .notNull()
    .references(() => operations.id, { onDelete: "cascade" }),
  entryType: text("entry_type").notNull(),
  body: text("body").notNull().default(""),
  status: text("status")
    .$type<OperationEntryStatus>()
    .notNull()
    .default("open"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  activityDate: date("activity_date", { mode: "date" }).notNull(),
  documentStage: text("document_stage").$type<OperationDocumentStage>(),
  parentEntryId: text("parent_entry_id"),
  amount: numeric("amount", { precision: 12, scale: 3 }),
  issuedOn: date("issued_on", { mode: "string" }),
  dueOn: date("due_on", { mode: "string" }),
  paymentTerms: text("payment_terms").notNull().default(""),
  taxVersion: integer("tax_version").notNull().default(0),
  vendorOrganizationId: text("vendor_organization_id").references(
    () => organizations.id,
  ),
  vendorContactId: text("vendor_contact_id").references(
    () => organizationContacts.id,
  ),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const operationDocumentLines = pgTable("operation_document_lines", {
  id: text("id").primaryKey(),
  entryId: text("entry_id")
    .notNull()
    .references(() => operationEntries.id, { onDelete: "cascade" }),
  description: text("description").notNull().default(""),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unitAmount: numeric("unit_amount", { precision: 12, scale: 3 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 3 }).notNull().default("0"),
  vatCodeId: text("vat_code_id"),
  netAmount: numeric("net_amount", { precision: 12, scale: 3 }),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 3 }),
  lineTotal: numeric("line_total", { precision: 12, scale: 3 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").$type<TaskStatus>().notNull().default("todo"),
  priority: text("priority").$type<TaskPriority>().notNull().default("medium"),
  dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }),
  organizationId: text("organization_id").references(() => organizations.id),
  operationId: text("operation_id").references(() => operations.id, {
    onDelete: "cascade",
  }),
  operationEntryId: text("operation_entry_id").references(
    () => operationEntries.id,
    { onDelete: "set null" },
  ),
  assignedToId: text("assigned_to_id").references(() => users.id),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const WORKSPACE_DRIVE_ID = "workspace";

export const workspaceDrive = pgTable("workspace_drive", {
  id: text("id").primaryKey(),
  connectedByUserId: text("connected_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
  googleEmail: text("google_email"),
  rootFolderId: text("root_folder_id"),
  workspaceFolderId: text("workspace_folder_id"),
  connectedAt: timestamp("connected_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const driveFiles = pgTable("drive_files", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  driveFileId: text("drive_file_id").notNull(),
  webViewLink: text("web_view_link"),
  organizationId: text("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  contactId: text("contact_id").references(() => organizationContacts.id, {
    onDelete: "cascade",
  }),
  operationEntryId: text("operation_entry_id").references(() => operationEntries.id, {
    onDelete: "cascade",
  }),
  uploadedById: text("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  assignedOrganizations: many(organizations),
  assignedTasks: many(tasks),
  uploadedFiles: many(driveFiles),
  createdInquiries: many(salesInquiries),
  assignedOperations: many(operations),
  createdOperations: many(operations, { relationName: "operationCreator" }),
  assignedOperationEntries: many(operationEntries),
  createdOperationEntries: many(operationEntries, {
    relationName: "operationEntryCreator",
  }),
  createdActivityTypes: many(operationActivityTypes, {
    relationName: "activityTypeCreator",
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [organizations.assignedToId],
    references: [users.id],
  }),
  tasks: many(tasks),
  driveFiles: many(driveFiles),
  contacts: many(organizationContacts),
  identifiers: many(organizationIdentifiers),
  operations: many(operations),
  vendorEntries: many(operationEntries, {
    relationName: "entryVendorOrganization",
  }),
}));

export const organizationIdentifiersRelations = relations(
  organizationIdentifiers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationIdentifiers.organizationId],
      references: [organizations.id],
    }),
  }),
);

export const organizationContactsRelations = relations(
  organizationContacts,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [organizationContacts.organizationId],
      references: [organizations.id],
    }),
    driveFiles: many(driveFiles),
    operations: many(operations),
    vendorEntries: many(operationEntries, {
      relationName: "entryVendorContact",
    }),
  }),
);

/** Standalone contacts use the same table with a nullable organization link. */
export const contacts = organizationContacts;

export const operationsRelations = relations(operations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [operations.organizationId],
    references: [organizations.id],
  }),
  contact: one(organizationContacts, {
    fields: [operations.contactId],
    references: [organizationContacts.id],
  }),
  assignedTo: one(users, {
    fields: [operations.assignedToId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [operations.createdById],
    references: [users.id],
    relationName: "operationCreator",
  }),
  entries: many(operationEntries),
  tasks: many(tasks),
}));

export const operationActivityTypesRelations = relations(
  operationActivityTypes,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [operationActivityTypes.createdById],
      references: [users.id],
      relationName: "activityTypeCreator",
    }),
  }),
);

export const operationEntriesRelations = relations(operationEntries, ({ one, many }) => ({
  operation: one(operations, {
    fields: [operationEntries.operationId],
    references: [operations.id],
  }),
  assignedTo: one(users, {
    fields: [operationEntries.assignedToId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [operationEntries.createdById],
    references: [users.id],
    relationName: "operationEntryCreator",
  }),
  files: many(driveFiles),
  lines: many(operationDocumentLines),
  vendorOrganization: one(organizations, {
    fields: [operationEntries.vendorOrganizationId],
    references: [organizations.id],
    relationName: "entryVendorOrganization",
  }),
  vendorContact: one(organizationContacts, {
    fields: [operationEntries.vendorContactId],
    references: [organizationContacts.id],
    relationName: "entryVendorContact",
  }),
}));

export const operationDocumentLinesRelations = relations(
  operationDocumentLines,
  ({ one }) => ({
    entry: one(operationEntries, {
      fields: [operationDocumentLines.entryId],
      references: [operationEntries.id],
    }),
  }),
);

export const salesInquiriesRelations = relations(salesInquiries, ({ one }) => ({
  createdBy: one(users, {
    fields: [salesInquiries.createdById],
    references: [users.id],
  }),
  convertedContact: one(organizationContacts, {
    fields: [salesInquiries.convertedContactId],
    references: [organizationContacts.id],
  }),
  convertedOrganization: one(organizations, {
    fields: [salesInquiries.convertedOrganizationId],
    references: [organizations.id],
  }),
  convertedOperation: one(operations, {
    fields: [salesInquiries.convertedOperationId],
    references: [operations.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  operation: one(operations, {
    fields: [tasks.operationId],
    references: [operations.id],
  }),
  operationEntry: one(operationEntries, {
    fields: [tasks.operationEntryId],
    references: [operationEntries.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
  }),
}));

export const workspaceDriveRelations = relations(workspaceDrive, ({ one }) => ({
  connectedBy: one(users, {
    fields: [workspaceDrive.connectedByUserId],
    references: [users.id],
  }),
}));

export const driveFilesRelations = relations(driveFiles, ({ one }) => ({
  organization: one(organizations, {
    fields: [driveFiles.organizationId],
    references: [organizations.id],
  }),
  contact: one(organizationContacts, {
    fields: [driveFiles.contactId],
    references: [organizationContacts.id],
  }),
  operationEntry: one(operationEntries, {
    fields: [driveFiles.operationEntryId],
    references: [operationEntries.id],
  }),
  uploadedBy: one(users, {
    fields: [driveFiles.uploadedById],
    references: [users.id],
  }),
}));

export const accountTypes = [
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
] as const;

export const normalBalances = ["debit", "credit"] as const;

export const journalStatuses = ["draft", "posted"] as const;

export const fiscalPeriodStatuses = ["open", "closed"] as const;

export const paymentDirections = ["receipt", "payment"] as const;

export const paymentMethods = ["cash", "bank", "card"] as const;

export const vatTreatments = [
  "standard",
  "zero",
  "exempt",
  "out_of_scope",
  "reverse_charge",
  "import",
  "non_recoverable",
] as const;

export const billStatuses = [
  "draft",
  "approved",
  "posted",
  "partial",
  "paid",
  "reversed",
] as const;

export const expenseStatuses = ["draft", "submitted", "approved", "posted", "reversed"] as const;

export type AccountType = (typeof accountTypes)[number];
export type NormalBalance = (typeof normalBalances)[number];
export type JournalStatus = (typeof journalStatuses)[number];
export type FiscalPeriodStatus = (typeof fiscalPeriodStatuses)[number];
export type PaymentDirection = (typeof paymentDirections)[number];
export type PaymentMethod = (typeof paymentMethods)[number];
export type VatTreatment = (typeof vatTreatments)[number];
export type BillStatus = (typeof billStatuses)[number];
export type ExpenseStatus = (typeof expenseStatuses)[number];

export const accountingSettings = pgTable("accounting_settings", {
  companyId: text("company_id").primaryKey(),
  currency: text("currency").notNull().default("BHD"),
  legalName: text("legal_name").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  crNumber: text("cr_number").notNull().default(""),
  vatRegistered: integer("vat_registered").notNull().default(0),
  vatNumber: text("vat_number").notNull().default(""),
  vatEffectiveFrom: date("vat_effective_from", { mode: "string" }),
  filingFrequency: text("filing_frequency").notNull().default("quarterly"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const accountingAccounts = pgTable(
  "accounting_accounts",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    accountType: text("account_type").$type<AccountType>().notNull(),
    subtype: text("subtype"),
    parentId: text("parent_id"),
    normalBalance: text("normal_balance").$type<NormalBalance>().notNull(),
    isActive: integer("is_active").notNull().default(1),
    isSystem: integer("is_system").notNull().default(0),
    currency: text("currency").notNull().default("BHD"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounting_accounts_company_code_idx").on(
      table.companyId,
      table.code,
    ),
    index("accounting_accounts_company_idx").on(table.companyId),
  ],
);

export const accountingPeriods = pgTable(
  "accounting_periods",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    name: text("name").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }).notNull(),
    status: text("status").$type<FiscalPeriodStatus>().notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" }),
    closedById: text("closed_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounting_periods_company_idx").on(table.companyId),
    uniqueIndex("accounting_periods_company_name_idx").on(
      table.companyId,
      table.name,
    ),
  ],
);

export const accountingVatCodes = pgTable(
  "accounting_vat_codes",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    rate: numeric("rate", { precision: 7, scale: 3 }).notNull(),
    treatment: text("treatment").$type<VatTreatment>().notNull(),
    isActive: integer("is_active").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounting_vat_codes_company_code_idx").on(
      table.companyId,
      table.code,
    ),
  ],
);

export const accountingJournals = pgTable(
  "accounting_journals",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    journalNumber: text("journal_number").notNull(),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id"),
    status: text("status").$type<JournalStatus>().notNull().default("draft"),
    reversalOfId: text("reversal_of_id"),
    reversedById: text("reversed_by_id"),
    operationId: text("operation_id"),
    operationEntryId: text("operation_entry_id"),
    billId: text("bill_id"),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    contactId: text("contact_id").references(() => organizationContacts.id, {
      onDelete: "set null",
    }),
    currency: text("currency").notNull().default("BHD"),
    postedAt: timestamp("posted_at", { withTimezone: true, mode: "date" }),
    postedById: text("posted_by_id").references(() => users.id),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounting_journals_company_number_idx").on(
      table.companyId,
      table.journalNumber,
    ),
    uniqueIndex("accounting_journals_source_unique")
      .on(table.companyId, table.sourceType, table.sourceId)
      .where(
        sql`${table.status} = 'posted' AND ${table.sourceId} IS NOT NULL AND ${table.reversalOfId} IS NULL AND ${table.reversedById} IS NULL`,
      ),
    uniqueIndex("accounting_journals_one_reversal")
      .on(table.reversalOfId)
      .where(sql`${table.reversalOfId} IS NOT NULL`),
    index("accounting_journals_company_date_idx").on(
      table.companyId,
      table.entryDate,
    ),
    index("accounting_journals_entry_idx").on(table.operationEntryId),
    uniqueIndex("accounting_journals_purchase_entry_once")
      .on(table.companyId, table.operationEntryId)
      .where(
        sql`${table.status} = 'posted' AND ${table.reversedById} IS NULL AND ${table.reversalOfId} IS NULL AND ${table.operationEntryId} IS NOT NULL AND ${table.sourceType} IN ('procurement', 'supplier_bill')`,
      ),
    uniqueIndex("accounting_journals_cost_entry_once")
      .on(table.companyId, table.operationEntryId)
      .where(
        sql`${table.status} = 'posted' AND ${table.reversedById} IS NULL AND ${table.reversalOfId} IS NULL AND ${table.operationEntryId} IS NOT NULL AND ${table.sourceType} IN ('operation_cost', 'expense')`,
      ),
  ],
);

export const accountingJournalLines = pgTable(
  "accounting_journal_lines",
  {
    id: text("id").primaryKey(),
    journalId: text("journal_id")
      .notNull()
      .references(() => accountingJournals.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => accountingAccounts.id),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    contactId: text("contact_id").references(() => organizationContacts.id, {
      onDelete: "set null",
    }),
    vatCodeId: text("vat_code_id").references(() => accountingVatCodes.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull().default(""),
    debit: numeric("debit", { precision: 14, scale: 3 }).notNull().default("0"),
    credit: numeric("credit", { precision: 14, scale: 3 }).notNull().default("0"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("accounting_journal_lines_journal_idx").on(table.journalId),
    index("accounting_journal_lines_account_idx").on(table.accountId),
    index("accounting_journal_lines_organization_idx").on(table.organizationId),
  ],
);

export const accountingPayments = pgTable(
  "accounting_payments",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    direction: text("direction").$type<PaymentDirection>().notNull(),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    contactId: text("contact_id").references(() => organizationContacts.id, {
      onDelete: "set null",
    }),
    operationEntryId: text("operation_entry_id"),
    billId: text("bill_id"),
    journalId: text("journal_id").references(() => accountingJournals.id),
    amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    method: text("method").$type<PaymentMethod>().notNull(),
    reference: text("reference").notNull().default(""),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounting_payments_company_date_idx").on(table.companyId, table.paidOn),
    index("accounting_payments_entry_idx").on(table.operationEntryId),
  ],
);

export const accountingBankAccounts = pgTable(
  "accounting_bank_accounts",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accountingAccounts.id),
    name: text("name").notNull(),
    institution: text("institution").notNull().default(""),
    accountNumber: text("account_number").notNull().default(""),
    currency: text("currency").notNull().default("BHD"),
    kind: text("kind").notNull().default("bank"),
    isActive: integer("is_active").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounting_bank_accounts_company_idx").on(table.companyId),
    uniqueIndex("accounting_bank_accounts_account_idx").on(table.accountId),
  ],
);

export const accountingAudit = pgTable(
  "accounting_audit",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounting_audit_company_idx").on(table.companyId, table.createdAt),
  ],
);

export const accountingBills = pgTable(
  "accounting_bills",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    billNumber: text("bill_number").notNull(),
    documentKind: text("document_kind").notNull().default("bill"),
    supplierOrganizationId: text("supplier_organization_id").references(
      () => organizations.id,
      { onDelete: "set null" },
    ),
    billDate: date("bill_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    status: text("status").$type<BillStatus>().notNull().default("draft"),
    currency: text("currency").notNull().default("BHD"),
    exchangeRate: numeric("exchange_rate", { precision: 14, scale: 6 })
      .notNull()
      .default("1.000000"),
    reference: text("reference").notNull().default(""),
    notes: text("notes").notNull().default(""),
    operationId: text("operation_id"),
    procurementEntryId: text("procurement_entry_id"),
    creditOfBillId: text("credit_of_bill_id"),
    subtotal: numeric("subtotal", { precision: 14, scale: 3 }).notNull().default("0"),
    discountTotal: numeric("discount_total", { precision: 14, scale: 3 })
      .notNull()
      .default("0"),
    vatTotal: numeric("vat_total", { precision: 14, scale: 3 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 3 }).notNull().default("0"),
    journalId: text("journal_id"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    approvedById: text("approved_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounting_bills_company_number_idx").on(
      table.companyId,
      table.billNumber,
    ),
    index("accounting_bills_company_date_idx").on(table.companyId, table.billDate),
    uniqueIndex("accounting_bills_procurement_idx")
      .on(table.procurementEntryId)
      .where(sql`${table.procurementEntryId} IS NOT NULL AND ${table.status} <> 'reversed'`),
  ],
);

export const accountingBillLines = pgTable(
  "accounting_bill_lines",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id")
      .notNull()
      .references(() => accountingBills.id, { onDelete: "cascade" }),
    expenseAccountId: text("expense_account_id")
      .notNull()
      .references(() => accountingAccounts.id),
    vatCodeId: text("vat_code_id").references(() => accountingVatCodes.id),
    description: text("description").notNull().default(""),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    unitAmount: numeric("unit_amount", { precision: 14, scale: 3 }).notNull(),
    discount: numeric("discount", { precision: 14, scale: 3 }).notNull().default("0"),
    netAmount: numeric("net_amount", { precision: 14, scale: 3 }).notNull(),
    vatAmount: numeric("vat_amount", { precision: 14, scale: 3 }).notNull(),
    lineTotal: numeric("line_total", { precision: 14, scale: 3 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("accounting_bill_lines_bill_idx").on(table.billId)],
);

export const accountingExpenses = pgTable(
  "accounting_expenses",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    expenseNumber: text("expense_number").notNull(),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    accountId: text("account_id")
      .notNull()
      .references(() => accountingAccounts.id),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    operationId: text("operation_id"),
    description: text("description").notNull(),
    reference: text("reference").notNull().default(""),
    method: text("method").notNull(),
    bankAccountId: text("bank_account_id"),
    vatCodeId: text("vat_code_id").references(() => accountingVatCodes.id),
    currency: text("currency").notNull().default("BHD"),
    exchangeRate: numeric("exchange_rate", { precision: 14, scale: 6 })
      .notNull()
      .default("1.000000"),
    netAmount: numeric("net_amount", { precision: 14, scale: 3 }).notNull(),
    vatAmount: numeric("vat_amount", { precision: 14, scale: 3 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 3 }).notNull(),
    status: text("status").$type<ExpenseStatus>().notNull().default("draft"),
    journalId: text("journal_id"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    approvedById: text("approved_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounting_expenses_company_number_idx").on(
      table.companyId,
      table.expenseNumber,
    ),
  ],
);

export const accountingAttachments = pgTable(
  "accounting_attachments",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    storagePath: text("storage_path").notNull(),
    uploadedById: text("uploaded_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounting_attachments_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const accountingExchangeRates = pgTable(
  "accounting_exchange_rates",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    currency: text("currency").notNull(),
    rateToBhd: numeric("rate_to_bhd", { precision: 14, scale: 6 }).notNull(),
    effectiveOn: date("effective_on", { mode: "string" }).notNull(),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("accounting_exchange_rates_company_idx").on(
      table.companyId,
      table.currency,
      table.effectiveOn,
    ),
  ],
);

export const accountingStatements = pgTable("accounting_statements", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  bankAccountId: text("bank_account_id")
    .notNull()
    .references(() => accountingBankAccounts.id),
  fileName: text("file_name").notNull().default(""),
  statementDate: date("statement_date", { mode: "string" }).notNull(),
  importedById: text("imported_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const accountingStatementLines = pgTable(
  "accounting_statement_lines",
  {
    id: text("id").primaryKey(),
    statementId: text("statement_id")
      .notNull()
      .references(() => accountingStatements.id, { onDelete: "cascade" }),
    bankAccountId: text("bank_account_id").notNull(),
    lineDate: date("line_date", { mode: "string" }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
    description: text("description").notNull().default(""),
    reference: text("reference").notNull().default(""),
    fingerprint: text("fingerprint").notNull(),
  },
  (table) => [
    uniqueIndex("accounting_statement_lines_fingerprint_idx").on(
      table.bankAccountId,
      table.fingerprint,
    ),
  ],
);

export const accountingReconciliations = pgTable("accounting_reconciliations", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  bankAccountId: text("bank_account_id")
    .notNull()
    .references(() => accountingBankAccounts.id),
  periodStart: date("period_start", { mode: "string" }).notNull(),
  periodEnd: date("period_end", { mode: "string" }).notNull(),
  statementBalance: numeric("statement_balance", { precision: 14, scale: 3 }).notNull(),
  ledgerBalance: numeric("ledger_balance", { precision: 14, scale: 3 }).notNull(),
  difference: numeric("difference", { precision: 14, scale: 3 }).notNull(),
  status: text("status").notNull().default("open"),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  completedById: text("completed_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const accountingReconciliationMatches = pgTable(
  "accounting_reconciliation_matches",
  {
    id: text("id").primaryKey(),
    reconciliationId: text("reconciliation_id")
      .notNull()
      .references(() => accountingReconciliations.id, { onDelete: "cascade" }),
    matchGroup: text("match_group").notNull(),
    statementLineId: text("statement_line_id").references(
      () => accountingStatementLines.id,
    ),
    journalLineId: text("journal_line_id").references(() => accountingJournalLines.id),
    amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
  },
  (table) => [
    index("accounting_reconciliation_matches_group_idx").on(table.matchGroup),
  ],
);

export const accountingVatReturns = pgTable(
  "accounting_vat_returns",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    dueOn: date("due_on", { mode: "string" }).notNull(),
    status: text("status").notNull().default("draft"),
    outputVat: numeric("output_vat", { precision: 14, scale: 3 }).notNull(),
    inputVat: numeric("input_vat", { precision: 14, scale: 3 }).notNull(),
    netVat: numeric("net_vat", { precision: 14, scale: 3 }).notNull(),
    preparerId: text("preparer_id").references(() => users.id),
    reviewerId: text("reviewer_id").references(() => users.id),
    filingReference: text("filing_reference").notNull().default(""),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("accounting_vat_returns_period_idx").on(
      table.companyId,
      table.periodStart,
      table.periodEnd,
    ),
  ],
);

export const accountingExceptions = pgTable("accounting_exceptions", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  kind: text("kind").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  detail: text("detail").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const accountingNotifications = pgTable("accounting_notifications", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  href: text("href").notNull().default(""),
  readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const accountingNotificationPreferences = pgTable("accounting_notification_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  emailEnabled: integer("email_enabled").notNull().default(0),
  inAppEnabled: integer("in_app_enabled").notNull().default(1),
});

export const accountingEmails = pgTable(
  "accounting_emails",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    template: text("template").notNull(),
    reminderKey: text("reminder_key").notNull().default(""),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    toAddress: text("to_address").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("queued"),
    providerId: text("provider_id").notNull().default(""),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error").notNull().default(""),
    createdById: text("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("accounting_emails_once_idx").on(
      table.entityType,
      table.entityId,
      table.template,
      table.reminderKey,
    ),
  ],
);

export const accountingReminderRules = pgTable("accounting_reminder_rules", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  daysOffset: integer("days_offset").notNull(),
  isActive: integer("is_active").notNull().default(1),
});

export const accountingIntercompany = pgTable("accounting_intercompany", {
  id: text("id").primaryKey(),
  groupRef: text("group_ref").notNull(),
  fromCompanyId: text("from_company_id").notNull(),
  toCompanyId: text("to_company_id").notNull(),
  kind: text("kind").notNull(),
  amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
  entryDate: date("entry_date", { mode: "string" }).notNull(),
  description: text("description").notNull(),
  fromJournalId: text("from_journal_id"),
  toJournalId: text("to_journal_id"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const accountingItems = pgTable(
  "accounting_items",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default(""),
    unit: text("unit").notNull().default("ea"),
    ownership: text("ownership").notNull().default("company"),
    reorderLevel: numeric("reorder_level", { precision: 14, scale: 3 }).notNull().default("0"),
    averageCost: numeric("average_cost", { precision: 14, scale: 3 }).notNull().default("0"),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
    allowNegative: integer("allow_negative").notNull().default(0),
    isActive: integer("is_active").notNull().default(1),
  },
  (table) => [uniqueIndex("accounting_items_sku_idx").on(table.companyId, table.sku)],
);

export const accountingWarehouses = pgTable("accounting_warehouses", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  name: text("name").notNull(),
  isActive: integer("is_active").notNull().default(1),
});

export const accountingLocations = pgTable("accounting_locations", {
  id: text("id").primaryKey(),
  warehouseId: text("warehouse_id").notNull().references(() => accountingWarehouses.id),
  name: text("name").notNull(),
});

export const accountingStockMoves = pgTable("accounting_stock_moves", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  itemId: text("item_id").notNull().references(() => accountingItems.id),
  warehouseId: text("warehouse_id").notNull().references(() => accountingWarehouses.id),
  locationId: text("location_id").references(() => accountingLocations.id),
  kind: text("kind").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 3 }).notNull().default("0"),
  journalId: text("journal_id"),
  movedOn: date("moved_on", { mode: "string" }).notNull(),
  note: text("note").notNull().default(""),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const accountingPayrollRuns = pgTable("accounting_payroll_runs", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  periodLabel: text("period_label").notNull(),
  status: text("status").notNull().default("draft"),
  gross: numeric("gross", { precision: 14, scale: 3 }).notNull(),
  deductions: numeric("deductions", { precision: 14, scale: 3 }).notNull().default("0"),
  statutory: numeric("statutory", { precision: 14, scale: 3 }).notNull().default("0"),
  netPay: numeric("net_pay", { precision: 14, scale: 3 }).notNull(),
  journalId: text("journal_id"),
  paymentJournalId: text("payment_journal_id"),
  createdById: text("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const accountingEmployees = pgTable(
  "accounting_employees",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    name: text("name").notNull(),
    jobTitle: text("job_title").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    salary: numeric("salary", { precision: 14, scale: 3 }).notNull().default("0"),
    scheme: text("scheme").notNull().default("sio_bahraini"),
    startedOn: date("started_on", { mode: "string" }),
    status: text("status").notNull().default("active"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("accounting_employees_company_idx").on(table.companyId)],
);

export const accountingAccessGrants = pgTable(
  "accounting_access_grants",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    companyId: text("company_id").notNull(),
    roleKey: text("role_key").notNull(),
  },
  (table) => [uniqueIndex("accounting_access_user_company_idx").on(table.userId, table.companyId)],
);

export const accountingApprovalPolicies = pgTable("accounting_approval_policies", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  documentType: text("document_type").notNull(),
  threshold: numeric("threshold", { precision: 14, scale: 3 }).notNull().default("0"),
  blockSelf: integer("block_self").notNull().default(1),
});

export const accountingApprovalEvents = pgTable("accounting_approval_events", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  stage: text("stage").notNull(),
  actorId: text("actor_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const accountingAccountsRelations = relations(
  accountingAccounts,
  ({ one, many }) => ({
    parent: one(accountingAccounts, {
      fields: [accountingAccounts.parentId],
      references: [accountingAccounts.id],
      relationName: "accountParent",
    }),
    children: many(accountingAccounts, { relationName: "accountParent" }),
    lines: many(accountingJournalLines),
    bankAccounts: many(accountingBankAccounts),
  }),
);

export const accountingJournalsRelations = relations(
  accountingJournals,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [accountingJournals.organizationId],
      references: [organizations.id],
    }),
    contact: one(organizationContacts, {
      fields: [accountingJournals.contactId],
      references: [organizationContacts.id],
    }),
    createdBy: one(users, {
      fields: [accountingJournals.createdById],
      references: [users.id],
    }),
    lines: many(accountingJournalLines),
    payments: many(accountingPayments),
  }),
);

export const accountingJournalLinesRelations = relations(
  accountingJournalLines,
  ({ one }) => ({
    journal: one(accountingJournals, {
      fields: [accountingJournalLines.journalId],
      references: [accountingJournals.id],
    }),
    account: one(accountingAccounts, {
      fields: [accountingJournalLines.accountId],
      references: [accountingAccounts.id],
    }),
    organization: one(organizations, {
      fields: [accountingJournalLines.organizationId],
      references: [organizations.id],
    }),
    vatCode: one(accountingVatCodes, {
      fields: [accountingJournalLines.vatCodeId],
      references: [accountingVatCodes.id],
    }),
  }),
);

export const accountingPaymentsRelations = relations(
  accountingPayments,
  ({ one }) => ({
    journal: one(accountingJournals, {
      fields: [accountingPayments.journalId],
      references: [accountingJournals.id],
    }),
    organization: one(organizations, {
      fields: [accountingPayments.organizationId],
      references: [organizations.id],
    }),
  }),
);

export const accountingBankAccountsRelations = relations(
  accountingBankAccounts,
  ({ one }) => ({
    account: one(accountingAccounts, {
      fields: [accountingBankAccounts.accountId],
      references: [accountingAccounts.id],
    }),
  }),
);

export const accountingReconciliationsRelations = relations(
  accountingReconciliations,
  ({ one }) => ({
    bank: one(accountingBankAccounts, {
      fields: [accountingReconciliations.bankAccountId],
      references: [accountingBankAccounts.id],
    }),
  }),
);

export const accountingBillsRelations = relations(accountingBills, ({ one, many }) => ({
  supplier: one(organizations, {
    fields: [accountingBills.supplierOrganizationId],
    references: [organizations.id],
  }),
  lines: many(accountingBillLines),
}));

export const accountingBillLinesRelations = relations(accountingBillLines, ({ one }) => ({
  bill: one(accountingBills, {
    fields: [accountingBillLines.billId],
    references: [accountingBills.id],
  }),
  account: one(accountingAccounts, {
    fields: [accountingBillLines.expenseAccountId],
    references: [accountingAccounts.id],
  }),
  vatCode: one(accountingVatCodes, {
    fields: [accountingBillLines.vatCodeId],
    references: [accountingVatCodes.id],
  }),
}));

export const accountingExpensesRelations = relations(accountingExpenses, ({ one }) => ({
  account: one(accountingAccounts, {
    fields: [accountingExpenses.accountId],
    references: [accountingAccounts.id],
  }),
  organization: one(organizations, {
    fields: [accountingExpenses.organizationId],
    references: [organizations.id],
  }),
  vatCode: one(accountingVatCodes, {
    fields: [accountingExpenses.vatCodeId],
    references: [accountingVatCodes.id],
  }),
}));

export const stockDocumentStatuses = ["draft", "approved", "posted", "reversed"] as const;
export type StockDocumentStatus = (typeof stockDocumentStatuses)[number];

export const stockDocuments = pgTable(
  "stock_documents",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    status: text("status").$type<StockDocumentStatus>().notNull().default("draft"),
    kind: text("kind").notNull(),
    purpose: text("purpose").notNull(),
    ownership: text("ownership").notNull(),
    ownerId: text("owner_id").notNull(),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => accountingWarehouses.id),
    locationId: text("location_id")
      .notNull()
      .references(() => accountingLocations.id),
    toWarehouseId: text("to_warehouse_id").references(() => accountingWarehouses.id),
    toLocationId: text("to_location_id").references(() => accountingLocations.id),
    movedOn: date("moved_on", { mode: "string" }).notNull(),
    sourceType: text("source_type").notNull().default(""),
    sourceId: text("source_id"),
    procurementEntryId: text("procurement_entry_id"),
    billId: text("bill_id"),
    reversalOfId: text("reversal_of_id"),
    reversedById: text("reversed_by_id"),
    reference: text("reference").notNull().default(""),
    counterparty: text("counterparty").notNull().default(""),
    note: text("note").notNull().default(""),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    approvedById: text("approved_by_id").references(() => users.id),
    postedById: text("posted_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
    postedAt: timestamp("posted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("stock_documents_company_idx").on(table.companyId, table.status),
    index("stock_documents_owner_idx").on(table.companyId, table.ownership, table.ownerId),
    uniqueIndex("stock_documents_one_reversal")
      .on(table.reversalOfId)
      .where(sql`${table.reversalOfId} IS NOT NULL`),
  ],
);

export const stockDocumentLines = pgTable(
  "stock_document_lines",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => stockDocuments.id),
    lineKey: text("line_key").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    sku: text("sku").notNull(),
    itemName: text("item_name").notNull().default(""),
    unit: text("unit").notNull().default("ea"),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 14, scale: 3 }),
    valuationStatus: text("valuation_status").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("stock_document_lines_key_idx").on(table.documentId, table.lineKey),
    uniqueIndex("stock_document_lines_idempotency_idx").on(table.idempotencyKey),
    index("stock_document_lines_sku_idx").on(table.sku),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    documentId: text("document_id")
      .notNull()
      .references(() => stockDocuments.id),
    documentLineId: text("document_line_id")
      .notNull()
      .references(() => stockDocumentLines.id),
    idempotencyKey: text("idempotency_key").notNull(),
    sku: text("sku").notNull(),
    itemName: text("item_name").notNull().default(""),
    unit: text("unit").notNull().default("ea"),
    ownership: text("ownership").notNull(),
    ownerId: text("owner_id").notNull(),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => accountingWarehouses.id),
    locationId: text("location_id")
      .notNull()
      .references(() => accountingLocations.id),
    purpose: text("purpose").notNull(),
    direction: text("direction").notNull(),
    ownerEffect: text("owner_effect").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 14, scale: 3 }),
    valueImpact: numeric("value_impact", { precision: 14, scale: 3 }).notNull().default("0"),
    valuationStatus: text("valuation_status").notNull(),
    postingStatus: text("posting_status").notNull().default("posted"),
    movedOn: date("moved_on", { mode: "string" }).notNull(),
    journalId: text("journal_id"),
    journalDebitCode: text("journal_debit_code"),
    journalCreditCode: text("journal_credit_code"),
    journalBlockReason: text("journal_block_reason").notNull().default(""),
    reversalOfId: text("reversal_of_id"),
    reversedById: text("reversed_by_id"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    approvedById: text("approved_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("stock_movements_idempotency_idx").on(table.idempotencyKey),
    uniqueIndex("stock_movements_one_reversal")
      .on(table.reversalOfId)
      .where(sql`${table.reversalOfId} IS NOT NULL`),
    index("stock_movements_owner_idx").on(
      table.companyId,
      table.sku,
      table.ownership,
      table.ownerId,
    ),
    index("stock_movements_document_idx").on(table.documentId),
  ],
);

export const stockOwnerBalances = pgTable(
  "stock_owner_balances",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    sku: text("sku").notNull(),
    ownership: text("ownership").notNull(),
    ownerId: text("owner_id").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
    pendingQuantity: numeric("pending_quantity", { precision: 14, scale: 3 }).notNull().default("0"),
    averageCost: numeric("average_cost", { precision: 14, scale: 3 }).notNull().default("0"),
    inventoryValue: numeric("inventory_value", { precision: 14, scale: 3 }).notNull().default("0"),
    allowNegative: integer("allow_negative").notNull().default(0),
  },
  (table) => [
    uniqueIndex("stock_owner_balances_identity_idx").on(
      table.companyId,
      table.sku,
      table.ownership,
      table.ownerId,
    ),
  ],
);

export const stockLocationBalances = pgTable(
  "stock_location_balances",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    sku: text("sku").notNull(),
    ownership: text("ownership").notNull(),
    ownerId: text("owner_id").notNull(),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => accountingWarehouses.id),
    locationId: text("location_id")
      .notNull()
      .references(() => accountingLocations.id),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull().default("0"),
    pendingQuantity: numeric("pending_quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  },
  (table) => [
    uniqueIndex("stock_location_balances_identity_idx").on(
      table.companyId,
      table.sku,
      table.ownership,
      table.ownerId,
      table.warehouseId,
      table.locationId,
    ),
  ],
);

export const stockOpeningProposals = pgTable(
  "stock_opening_proposals",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id").notNull(),
    sku: text("sku").notNull(),
    ownership: text("ownership").notNull(),
    ownerId: text("owner_id").notNull(),
    warehouseId: text("warehouse_id")
      .notNull()
      .references(() => accountingWarehouses.id),
    locationId: text("location_id")
      .notNull()
      .references(() => accountingLocations.id),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    averageCost: numeric("average_cost", { precision: 14, scale: 3 }).notNull().default("0"),
    cutoverDate: date("cutover_date", { mode: "string" }).notNull(),
    legacyItemId: text("legacy_item_id"),
    status: text("status").notNull().default("proposed"),
    note: text("note").notNull().default(""),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("stock_opening_proposals_identity_idx").on(
      table.companyId,
      table.sku,
      table.ownership,
      table.ownerId,
      table.warehouseId,
      table.locationId,
      table.cutoverDate,
    ),
  ],
);
