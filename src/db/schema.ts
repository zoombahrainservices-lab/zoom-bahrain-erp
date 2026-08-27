import { relations } from "drizzle-orm";
import { date, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
