import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const roleValues = ["user", "officer", "admin"] as const;
export const entityStatusValues = ["active", "inactive"] as const;
export const priorityValues = ["low", "medium", "high", "critical"] as const;
export const grievanceStatusValues = [
  "submitted",
  "acknowledged",
  "assigned",
  "in_progress",
  "escalated",
  "resolved",
  "reopened",
  "closed",
] as const;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: roleValues }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  passwordHash: text("passwordHash"),
  departmentId: integer("departmentId").references(() => departments.id, { onDelete: "set null" }),
  active: integer("active").default(1).notNull(),
});

export const departments = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  slaHours: integer("slaHours").default(72).notNull(),
  status: text("status", { enum: entityStatusValues }).default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const grievanceCategories = sqliteTable("grievanceCategories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  departmentId: integer("departmentId")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  status: text("status", { enum: entityStatusValues }).default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
}, table => ({
  uniqueDepartmentCategory: uniqueIndex("grievance_categories_department_name_unique").on(table.departmentId, table.name),
}));

export const officerProfiles = sqliteTable("officerProfiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  departmentId: integer("departmentId")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  designation: text("designation"),
  availability: text("availability", { enum: ["available", "unavailable"] })
    .default("available")
    .notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const grievances = sqliteTable("grievances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trackingNumber: text("trackingNumber").notNull().unique(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  contactEmail: text("contactEmail"),
  categoryId: integer("categoryId")
    .notNull()
    .references(() => grievanceCategories.id, { onDelete: "restrict" }),
  departmentId: integer("departmentId")
    .notNull()
    .references(() => departments.id, { onDelete: "restrict" }),
  assignedOfficerId: integer("assignedOfficerId").references(() => users.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  priority: text("priority", { enum: priorityValues }).default("medium").notNull(),
  status: text("status", { enum: grievanceStatusValues }).default("submitted").notNull(),
  resolutionDetails: text("resolutionDetails"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  resolvedAt: integer("resolvedAt", { mode: "timestamp" }),
  closedAt: integer("closedAt", { mode: "timestamp" }),
  dueAt: integer("dueAt", { mode: "timestamp" }),
  escalatedAt: integer("escalatedAt", { mode: "timestamp" }),
});

export const grievanceHistory = sqliteTable("grievanceHistory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  grievanceId: integer("grievanceId")
    .notNull()
    .references(() => grievances.id, { onDelete: "cascade" }),
  previousStatus: text("previousStatus", { enum: grievanceStatusValues }),
  newStatus: text("newStatus", { enum: grievanceStatusValues }).notNull(),
  activityType: text("activityType").default("status_change").notNull(),
  remarks: text("remarks"),
  actionTaken: text("actionTaken"),
  changedByUserId: integer("changedByUserId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  grievanceId: integer("grievanceId")
    .notNull()
    .references(() => grievances.id, { onDelete: "cascade" }),
  fileKey: text("fileKey").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileName: text("fileName").notNull(),
  mimeType: text("mimeType").notNull(),
  fileSize: integer("fileSize").notNull(),
  uploadedByUserId: integer("uploadedByUserId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  uploadedAt: integer("uploadedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  grievanceId: integer("grievanceId")
    .notNull()
    .unique()
    .references(() => grievances.id, { onDelete: "cascade" }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  grievanceId: integer("grievanceId").references(() => grievances.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(),
  readAt: integer("readAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type GrievanceStatus = (typeof grievanceStatusValues)[number];
export type GrievancePriority = (typeof priorityValues)[number];
