import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  attachments,
  departments,
  feedback,
  grievanceCategories,
  grievances,
  notifications,
  officerProfiles,
  priorityValues,
  grievanceStatusValues,
  users,
} from "../drizzle/schema";
import * as db from "./db";
import { storagePut } from "./storage";
import { assertWorkflowTransition, statusLabel } from "./workflow";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  clearLoginAttempts,
  createInternalSession,
  hashPassword,
  INTERNAL_COOKIE_NAME,
  internalCookieOptions,
  isLoginRateLimited,
  recordFailedLogin,
  verifyPassword,
} from "./internalAuth";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const roleProcedure = (allowedRoles: Array<"user" | "officer" | "admin">) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to access this workspace." });
    }
    return next({ ctx });
  });
const officerProcedure = roleProcedure(["officer", "admin"]);
const adminProcedure = roleProcedure(["admin"]);

const safeAttachmentTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function requireDb<T>(value: T | null): T {
  if (!value) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The service is temporarily unavailable." });
  return value;
}

async function getOwnedOrAccessibleCase(grievanceId: number, userId: number, role: "user" | "officer" | "admin", departmentId?: number | null) {
  const detail = await db.getGrievanceDetail(grievanceId);
  if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Grievance not found." });
  const canAccess = role === "admin" || detail.grievance.userId === userId || detail.grievance.assignedOfficerId === userId || (role === "officer" && departmentId != null && detail.grievance.departmentId === departmentId);
  if (!canAccess) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot access this grievance." });
  return detail;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    internalLogin: publicProcedure.input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(8).max(200) })).mutation(async ({ ctx, input }) => {
      if (isLoginRateLimited(input.email)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again later." });
      }
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash || user.active !== 1 || (user.role !== "officer" && user.role !== "admin") || !verifyPassword(input.password, user.passwordHash)) {
        recordFailedLogin(input.email);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid staff credentials." });
      }
      clearLoginAttempts(input.email);
      const token = await createInternalSession(user);
      ctx.res.cookie(INTERNAL_COOKIE_NAME, token, { ...internalCookieOptions(ctx.req), maxAge: 8 * 60 * 60 * 1000 });
      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId } } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      ctx.res.clearCookie(INTERNAL_COOKIE_NAME, { ...internalCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  public: router({
    catalog: publicProcedure.query(() => db.getActiveCatalog()),
    lookup: publicProcedure.input(z.object({ trackingNumber: z.string().trim().min(5).max(32) })).query(async ({ input }) => {
      const database = requireDb(await db.getDb());
      const rows = await database
        .select({
          trackingNumber: grievances.trackingNumber,
          title: grievances.title,
          status: grievances.status,
          priority: grievances.priority,
          createdAt: grievances.createdAt,
          updatedAt: grievances.updatedAt,
          departmentName: departments.name,
        })
        .from(grievances)
        .innerJoin(departments, eq(grievances.departmentId, departments.id))
        .where(eq(grievances.trackingNumber, input.trackingNumber.toUpperCase()))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "No grievance was found with that tracking ID." });
      return rows[0];
    }),
  }),

  portal: router({
    create: publicProcedure.input(z.object({ title: z.string().trim().min(8, "Use at least 8 characters for the title.").max(180), departmentId: z.number().int().positive(), categoryId: z.number().int().positive(), description: z.string().trim().min(20, "Provide at least 20 characters of detail.").max(5000), location: z.string().trim().max(240).optional(), contactEmail: z.string().trim().email().max(320).optional() })).mutation(async ({ input }) => db.createGrievanceRecord({ ...input, userId: await db.getPublicServiceActor() })),
    feedback: publicProcedure.input(z.object({ trackingNumber: z.string().trim().regex(/^GRV-\d{4}-\d{5}$/i), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() })).mutation(({ input }) => db.submitPublicFeedback(input)),
    detail: publicProcedure.input(z.object({ trackingNumber: z.string().trim().regex(/^GRV-\d{4}-\d{5}$/i, "Enter a valid grievance tracking reference.") })).query(async ({ input }) => {
      const detail = await db.getGrievanceDetailByTracking(input.trackingNumber);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Grievance not found." });
      return detail;
    }),
    uploadAttachment: publicProcedure.input(z.object({ trackingNumber: z.string().trim().regex(/^GRV-\d{4}-\d{5}$/i), fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]), fileData: z.string().min(1).max(2_800_000) })).mutation(async ({ input }) => {
      const detail = await db.getGrievanceDetailByTracking(input.trackingNumber);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Grievance not found." });
      if (!safeAttachmentTypes.includes(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Only PDF, JPG, PNG, and WEBP documents are accepted." });
      const buffer = Buffer.from(input.fileData, "base64");
      if (buffer.length > 2 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Attachments must be 2 MB or smaller." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const grievanceId = detail.grievance.id;
      const stored = await storagePut(`grievances/${grievanceId}/${Date.now()}-${safeName}`, buffer, input.mimeType);
      const database = requireDb(await db.getDb());
      await database.insert(attachments).values({ grievanceId, fileKey: stored.key, fileUrl: stored.url, fileName: safeName, mimeType: input.mimeType, fileSize: buffer.length, uploadedByUserId: await db.getPublicServiceActor() });
      return { success: true, url: stored.url };
    }),
  }),

  profile: router({
    update: protectedProcedure.input(z.object({
      name: z.string().trim().min(2).max(160).optional(),
      email: z.string().trim().email().max(320).optional(),
    }).refine(input => Boolean(input.name || input.email), { message: "Add a name or email to update your profile." })).mutation(async ({ ctx, input }) => {
      const database = requireDb(await db.getDb());
      await database.update(users).set({
        ...(input.name ? { name: input.name } : {}),
        ...(input.email ? { email: input.email } : {}),
      }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
  }),

  citizen: router({
    dashboard: roleProcedure(["user"]).query(async ({ ctx }) => {
      const mine = await db.listGrievancesForUser(ctx.user.id);
      const counts = mine.reduce<Record<string, number>>((memo, item) => {
        memo[item.grievance.status] = (memo[item.grievance.status] || 0) + 1;
        return memo;
      }, {});
      return { total: mine.length, counts, recent: mine.slice(0, 5) };
    }),
    list: roleProcedure(["user"]).input(z.object({ query: z.string().trim().max(80).optional() }).optional()).query(({ ctx, input }) => db.listGrievancesForUser(ctx.user.id, input?.query)),
    create: roleProcedure(["user"]).input(z.object({
      title: z.string().trim().min(8, "Use at least 8 characters for the title.").max(180),
      departmentId: z.number().int().positive(),
      categoryId: z.number().int().positive(),
      description: z.string().trim().min(20, "Provide at least 20 characters of detail.").max(5000),
      location: z.string().trim().max(240).optional(),
      contactEmail: z.string().trim().email().max(320).optional(),
    })).mutation(({ ctx, input }) => db.createGrievanceRecord({ ...input, userId: ctx.user.id })),
    feedback: roleProcedure(["user"]).input(z.object({ grievanceId: z.number().int().positive(), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const detail = await getOwnedOrAccessibleCase(input.grievanceId, ctx.user.id, "user");
      if (!['resolved', 'closed'].includes(detail.grievance.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Feedback becomes available once a grievance is resolved." });
      const database = requireDb(await db.getDb());
      await database.insert(feedback).values({ ...input, userId: ctx.user.id, comment: input.comment || null });
      return { success: true };
    }),
    reopen: roleProcedure(["user"]).input(z.object({ grievanceId: z.number().int().positive(), remarks: z.string().trim().min(8).max(1200) })).mutation(async ({ ctx, input }) => {
      const detail = await getOwnedOrAccessibleCase(input.grievanceId, ctx.user.id, "user");
      assertWorkflowTransition(detail.grievance.status, "reopened", "user");
      await db.updateGrievanceWorkflow({ grievanceId: input.grievanceId, nextStatus: "reopened", remarks: input.remarks, changedByUserId: ctx.user.id });
      return { success: true };
    }),
  }),

  grievances: router({
    detailByTracking: protectedProcedure.input(z.object({ trackingNumber: z.string().trim().regex(/^GRV-\d{4}-\d{5}$/i) })).query(async ({ ctx, input }) => {
      const detail = await db.getGrievanceDetailByTracking(input.trackingNumber);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Grievance not found." });
      return getOwnedOrAccessibleCase(detail.grievance.id, ctx.user.id, ctx.user.role, ctx.user.departmentId);
    }),
    detail: protectedProcedure.input(z.object({ grievanceId: z.number().int().positive() })).query(({ ctx, input }) => getOwnedOrAccessibleCase(input.grievanceId, ctx.user.id, ctx.user.role, ctx.user.departmentId)),
    uploadAttachment: protectedProcedure.input(z.object({
      grievanceId: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
      fileData: z.string().min(1).max(2_800_000),
    })).mutation(async ({ ctx, input }) => {
      const detail = await getOwnedOrAccessibleCase(input.grievanceId, ctx.user.id, ctx.user.role);
      if (ctx.user.role === "user" && detail.grievance.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You can only attach files to your own grievance." });
      if (!safeAttachmentTypes.includes(input.mimeType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Only PDF, JPG, PNG, and WEBP documents are accepted." });
      const buffer = Buffer.from(input.fileData, "base64");
      if (buffer.length > 2 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Attachments must be 2 MB or smaller." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`grievances/${input.grievanceId}/${Date.now()}-${safeName}`, buffer, input.mimeType);
      const database = requireDb(await db.getDb());
      await database.insert(attachments).values({
        grievanceId: input.grievanceId,
        fileKey: stored.key,
        fileUrl: stored.url,
        fileName: safeName,
        mimeType: input.mimeType,
        fileSize: buffer.length,
        uploadedByUserId: ctx.user.id,
      });
      return { success: true, url: stored.url };
    }),
  }),

  officer: router({
    suggestions: officerProcedure.input(z.object({ search: z.string().trim().min(2).max(80) })).query(({ ctx, input }) => db.suggestInternalGrievances(input.search, ctx.user.id, ctx.user.role === "admin" ? "admin" : "officer", ctx.user.departmentId)),
    queue: officerProcedure.input(z.object({
      search: z.string().trim().max(80).optional(),
      status: z.enum(grievanceStatusValues).optional(),
      priority: z.enum(priorityValues).optional(),
      categoryId: z.number().int().positive().optional(),
      dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      sort: z.enum(["updated_desc", "updated_asc", "priority_desc", "priority_asc", "status_asc"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
      overdue: z.boolean().optional(),
    }).optional()).query(({ ctx, input }) => db.listAssignedGrievances(ctx.user.id, input, ctx.user.role === "admin" ? "admin" : "officer", ctx.user.departmentId)),
    addProgress: officerProcedure.input(z.object({ grievanceId: z.number().int().positive(), remarks: z.string().trim().max(1500).optional(), actionTaken: z.string().trim().max(1500).optional() }).refine(value => Boolean(value.remarks || value.actionTaken), { message: "Add a remark or action taken." })).mutation(async ({ ctx, input }) => {
      const detail = await getOwnedOrAccessibleCase(input.grievanceId, ctx.user.id, ctx.user.role);
      if (ctx.user.role === "officer" && detail.grievance.assignedOfficerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You can only update grievances assigned to you." });
      await db.addGrievanceProgress({ ...input, changedByUserId: ctx.user.id });
      return { success: true };
    }),
    updateCase: officerProcedure.input(z.object({
      grievanceId: z.number().int().positive(),
      nextStatus: z.enum(grievanceStatusValues),
      priority: z.enum(priorityValues).optional(),
      remarks: z.string().trim().max(1500).optional(),
      actionTaken: z.string().trim().max(1500).optional(),
      resolutionDetails: z.string().trim().max(2000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const detail = await getOwnedOrAccessibleCase(input.grievanceId, ctx.user.id, ctx.user.role);
      if (ctx.user.role === "officer" && detail.grievance.assignedOfficerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You can only update grievances assigned to you." });
      assertWorkflowTransition(detail.grievance.status, input.nextStatus, ctx.user.role);
      const database = requireDb(await db.getDb());
      if (input.priority) await database.update(grievances).set({ priority: input.priority }).where(eq(grievances.id, input.grievanceId));
      await db.updateGrievanceWorkflow({ ...input, changedByUserId: ctx.user.id });
      return { success: true };
    }),
    bulkUpdate: officerProcedure.input(z.object({
      grievanceIds: z.array(z.number().int().positive()).min(1).max(50).transform(ids => Array.from(new Set(ids))),
      action: z.enum(["priority", "status"]),
      priority: z.enum(priorityValues).optional(),
      nextStatus: z.enum(grievanceStatusValues).optional(),
    }).superRefine((input, context) => {
      if (input.action === "priority" && !input.priority) context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a priority for the selected grievances.", path: ["priority"] });
      if (input.action === "status" && !input.nextStatus) context.addIssue({ code: z.ZodIssueCode.custom, message: "Choose a workflow status for the selected grievances.", path: ["nextStatus"] });
    })).mutation(async ({ ctx, input }) => {
      const records = await Promise.all(input.grievanceIds.map(id => db.getGrievanceDetail(id)));
      if (records.some(record => !record)) throw new TRPCError({ code: "NOT_FOUND", message: "One or more selected grievances could not be found." });
      const selected = records.filter((record): record is NonNullable<typeof record> => Boolean(record));
      if (ctx.user.role === "officer" && selected.some(record => record.grievance.assignedOfficerId !== ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only bulk-update grievances assigned to you." });
      }
      if (input.action === "priority" && input.priority) {
        await db.updateGrievancePriorityBatch({ grievanceIds: input.grievanceIds, priority: input.priority, changedByUserId: ctx.user.id });
        return { success: true, updated: input.grievanceIds.length };
      }
      if (!input.nextStatus) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a workflow status." });
      selected.forEach(record => assertWorkflowTransition(record.grievance.status, input.nextStatus!, ctx.user.role));
      for (const record of selected) {
        await db.updateGrievanceWorkflow({ grievanceId: record.grievance.id, nextStatus: input.nextStatus, remarks: "Bulk status update from the officer queue.", changedByUserId: ctx.user.id });
      }
      return { success: true, updated: selected.length };
    }),
  }),

  admin: router({
    escalateOverdue: adminProcedure.mutation(() => db.escalateOverdueGrievances()),
    dashboard: adminProcedure.query(async () => {
      await db.escalateOverdueGrievances();
      return db.getAdminDashboardData();
    }),
    listGrievances: adminProcedure.input(z.object({ search: z.string().trim().max(80).optional(), status: z.enum(grievanceStatusValues).optional() }).optional()).query(({ input }) => db.listAllGrievances(input)),
    departments: adminProcedure.query(async () => {
      const database = requireDb(await db.getDb());
      return database.select().from(departments).orderBy(departments.name);
    }),
    categories: adminProcedure.query(async () => {
      const database = requireDb(await db.getDb());
      return database.select({ category: grievanceCategories, department: departments }).from(grievanceCategories).innerJoin(departments, eq(grievanceCategories.departmentId, departments.id)).orderBy(grievanceCategories.name);
    }),
    users: adminProcedure.query(async () => {
      const database = requireDb(await db.getDb());
      return database.select().from(users).orderBy(desc(users.createdAt));
    }),
    officers: adminProcedure.query(async () => {
      const database = requireDb(await db.getDb());
      return database.select({ profile: officerProfiles, user: users, department: departments }).from(officerProfiles).innerJoin(users, eq(officerProfiles.userId, users.id)).innerJoin(departments, eq(officerProfiles.departmentId, departments.id));
    }),
    assign: adminProcedure.input(z.object({ grievanceId: z.number().int().positive(), officerId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const database = requireDb(await db.getDb());
      const detail = await getOwnedOrAccessibleCase(input.grievanceId, ctx.user.id, "admin");
      const profile = await database.select().from(officerProfiles).where(eq(officerProfiles.userId, input.officerId)).limit(1);
      if (!profile[0] || profile[0].departmentId !== detail.grievance.departmentId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an available officer from the grievance department." });
      if (detail.grievance.status === "submitted") {
        await db.updateGrievanceWorkflow({ grievanceId: input.grievanceId, nextStatus: "acknowledged", remarks: "Grievance acknowledged for department review.", changedByUserId: ctx.user.id });
      }
      const refreshed = await db.getGrievanceDetail(input.grievanceId);
      if (!refreshed || refreshed.grievance.status !== "acknowledged") throw new TRPCError({ code: "BAD_REQUEST", message: "Only acknowledged grievances can be assigned." });
      await database.update(grievances).set({ assignedOfficerId: input.officerId }).where(eq(grievances.id, input.grievanceId));
      await db.updateGrievanceWorkflow({ grievanceId: input.grievanceId, nextStatus: "assigned", remarks: "Grievance assigned to the responsible officer.", changedByUserId: ctx.user.id });
      await database.insert(notifications).values({ userId: input.officerId, grievanceId: input.grievanceId, title: "New grievance assignment", message: `You have been assigned ${detail.grievance.trackingNumber}.`, type: "assigned" });
      if (detail.grievance.contactEmail) void db.logEmailNotificationAttempt({ userId: detail.grievance.userId, grievanceId: input.grievanceId, recipient: detail.grievance.contactEmail, event: "assignment", trackingNumber: detail.grievance.trackingNumber });
      return { success: true };
    }),
    createDepartment: adminProcedure.input(z.object({ name: z.string().trim().min(3).max(120), description: z.string().trim().max(1000).optional(), slaHours: z.number().int().min(1).max(720).default(72) })).mutation(async ({ input }) => {
      const database = requireDb(await db.getDb());
      await database.insert(departments).values({ name: input.name, description: input.description || null, slaHours: input.slaHours });
      return { success: true };
    }),
    updateDepartmentSla: adminProcedure.input(z.object({ departmentId: z.number().int().positive(), slaHours: z.number().int().min(1).max(720) })).mutation(async ({ input }) => {
      const database = requireDb(await db.getDb());
      await database.update(departments).set({ slaHours: input.slaHours }).where(eq(departments.id, input.departmentId));
      return { success: true };
    }),
    setDepartmentStatus: adminProcedure.input(z.object({ departmentId: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(async ({ input }) => {
      const database = requireDb(await db.getDb());
      await database.update(departments).set({ status: input.status }).where(eq(departments.id, input.departmentId));
      return { success: true };
    }),
    createCategory: adminProcedure.input(z.object({ name: z.string().trim().min(3).max(120), departmentId: z.number().int().positive(), description: z.string().trim().max(1000).optional() })).mutation(async ({ input }) => {
      const database = requireDb(await db.getDb());
      await database.insert(grievanceCategories).values({ name: input.name, departmentId: input.departmentId, description: input.description || null });
      return { success: true };
    }),
    setCategoryStatus: adminProcedure.input(z.object({ categoryId: z.number().int().positive(), status: z.enum(["active", "inactive"]) })).mutation(async ({ input }) => {
      const database = requireDb(await db.getDb());
      await database.update(grievanceCategories).set({ status: input.status }).where(eq(grievanceCategories.id, input.categoryId));
      return { success: true };
    }),
    makeOfficer: adminProcedure.input(z.object({ userId: z.number().int().positive(), departmentId: z.number().int().positive(), designation: z.string().trim().max(120).optional() })).mutation(async ({ input }) => {
      const database = requireDb(await db.getDb());
      const user = await database.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      await database.update(users).set({ role: "officer" }).where(eq(users.id, input.userId));
      const existingProfile = await database.select().from(officerProfiles).where(eq(officerProfiles.userId, input.userId)).limit(1);
      const now = new Date();
      if (existingProfile[0]) {
        await database.update(officerProfiles).set({ departmentId: input.departmentId, designation: input.designation || null, updatedAt: now }).where(eq(officerProfiles.userId, input.userId));
      } else {
        await database.insert(officerProfiles).values({ userId: input.userId, departmentId: input.departmentId, designation: input.designation || null, createdAt: now, updatedAt: now });
      }
      return { success: true };
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const database = requireDb(await db.getDb());
      return database.select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(12);
    }),
    markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const database = requireDb(await db.getDb());
      await database.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
