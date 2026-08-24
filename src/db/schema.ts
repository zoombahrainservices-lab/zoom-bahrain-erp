import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userRoles = [
  "admin",
  "manager",
  "sales",
  "accountant",
  "employee",
] as const;

export const clientStatuses = ["lead", "active", "inactive"] as const;

export const taskStatuses = ["todo", "in_progress", "review", "done"] as const;

export const taskPriorities = ["low", "medium", "high", "urgent"] as const;

export type UserRole = (typeof userRoles)[number];
export type ClientStatus = (typeof clientStatuses)[number];
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

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

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  status: text("status").$type<ClientStatus>().notNull().default("lead"),
  notes: text("notes"),
  assignedToId: text("assigned_to_id").references(() => users.id),
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
  clientId: text("client_id").references(() => clients.id),
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

export const googleConnections = pgTable("google_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
  googleEmail: text("google_email"),
  rootFolderId: text("root_folder_id"),
  clientsFolderId: text("clients_folder_id"),
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
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  uploadedById: text("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  googleConnection: one(googleConnections),
  assignedClients: many(clients),
  assignedTasks: many(tasks),
  uploadedFiles: many(driveFiles),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [clients.assignedToId],
    references: [users.id],
  }),
  tasks: many(tasks),
  driveFiles: many(driveFiles),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
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

export const googleConnectionsRelations = relations(
  googleConnections,
  ({ one }) => ({
    user: one(users, {
      fields: [googleConnections.userId],
      references: [users.id],
    }),
  }),
);

export const driveFilesRelations = relations(driveFiles, ({ one }) => ({
  client: one(clients, {
    fields: [driveFiles.clientId],
    references: [clients.id],
  }),
  uploadedBy: one(users, {
    fields: [driveFiles.uploadedById],
    references: [users.id],
  }),
}));
