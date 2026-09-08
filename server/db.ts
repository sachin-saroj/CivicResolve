import { createClient } from "@libsql/client";
import { and, desc, eq, gte, inArray, isNull, like, lte, notInArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import {
  attachments,
  departments,
  feedback,
  grievanceCategories,
  grievanceHistory,
  grievances,
  notifications,
  officerProfiles,
  type GrievancePriority,
  type GrievanceStatus,
  type InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _tablesInitialized = false;

async function initTables(client: ReturnType<typeof createClient>) {
  if (_tablesInitialized) return;
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openId TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT,
      loginMethod TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastSignedIn INTEGER NOT NULL,
      passwordHash TEXT,
      departmentId INTEGER REFERENCES departments(id),
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      slaHours INTEGER NOT NULL DEFAULT 72,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grievanceCategories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      departmentId INTEGER NOT NULL REFERENCES departments(id),
      status TEXT NOT NULL DEFAULT 'active',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS grievance_categories_department_name_unique
      ON grievanceCategories(departmentId, name);

    CREATE TABLE IF NOT EXISTS officerProfiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL UNIQUE REFERENCES users(id),
      departmentId INTEGER NOT NULL REFERENCES departments(id),
      designation TEXT,
      availability TEXT NOT NULL DEFAULT 'available',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS grievances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trackingNumber TEXT NOT NULL UNIQUE,
      userId INTEGER NOT NULL REFERENCES users(id),
      contactEmail TEXT,
      categoryId INTEGER NOT NULL REFERENCES grievanceCategories(id),
      departmentId INTEGER NOT NULL REFERENCES departments(id),
      assignedOfficerId INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'submitted',
      resolutionDetails TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      resolvedAt INTEGER,
      closedAt INTEGER,
      dueAt INTEGER,
      escalatedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS grievanceHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grievanceId INTEGER NOT NULL REFERENCES grievances(id),
      previousStatus TEXT,
      newStatus TEXT NOT NULL,
      activityType TEXT NOT NULL DEFAULT 'status_change',
      remarks TEXT,
      actionTaken TEXT,
      changedByUserId INTEGER NOT NULL REFERENCES users(id),
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grievanceId INTEGER NOT NULL REFERENCES grievances(id),
      fileKey TEXT NOT NULL,
      fileUrl TEXT NOT NULL,
      fileName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      uploadedByUserId INTEGER NOT NULL REFERENCES users(id),
      uploadedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grievanceId INTEGER NOT NULL UNIQUE REFERENCES grievances(id),
      userId INTEGER NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL,
      comment TEXT,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL REFERENCES users(id),
      grievanceId INTEGER REFERENCES grievances(id),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      readAt INTEGER,
      createdAt INTEGER NOT NULL
    );
  `);
  _tablesInitialized = true;
}

export async function getDb() {
  if (!_db) {
    try {
      const url = process.env.DATABASE_URL || "file:./local.db";
      const client = createClient({ url });
      await initTables(client);
      _db = drizzle(client);
      await ensureInitialCatalog();
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
  const now = new Date();

  if (existing[0]) {
    const updateData: Partial<InsertUser> = {
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? now,
    };
    if (user.name !== undefined) updateData.name = user.name;
    if (user.email !== undefined) updateData.email = user.email;
    if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;
    if (user.role !== undefined) {
      updateData.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      updateData.role = "admin";
    }
    if (user.passwordHash !== undefined) updateData.passwordHash = user.passwordHash;
    if (user.departmentId !== undefined) updateData.departmentId = user.departmentId;
    if (user.active !== undefined) updateData.active = user.active;

    await db.update(users).set(updateData).where(eq(users.openId, user.openId));
  } else {
    const values: InsertUser = {
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      createdAt: user.createdAt ?? now,
      updatedAt: user.updatedAt ?? now,
      lastSignedIn: user.lastSignedIn ?? now,
      passwordHash: user.passwordHash ?? null,
      departmentId: user.departmentId ?? null,
      active: user.active ?? 1,
    };
    await db.insert(users).values(values);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const database = await getDb();
  if (!database) return undefined;
  const result = await database.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const database = await getDb();
  if (!database) return undefined;
  const result = await database.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getActiveCatalog() {
  const db = await getDb();
  if (!db) return { departments: [], categories: [] };
  const [activeDepartments, activeCategories] = await Promise.all([
    db.select().from(departments).where(eq(departments.status, "active")).orderBy(departments.name),
    db
      .select()
      .from(grievanceCategories)
      .where(eq(grievanceCategories.status, "active"))
      .orderBy(grievanceCategories.name),
  ]);
  return { departments: activeDepartments, categories: activeCategories };
}

const starterCatalog = [
  { name: "Public Works", description: "Roads, street lighting, drainage, and public spaces.", categories: ["Street lighting", "Road maintenance", "Drainage and flooding", "Public space maintenance"] },
  { name: "Water and Sanitation", description: "Water supply, wastewater, and municipal sanitation services.", categories: ["Water supply", "Sewerage", "Waste collection", "Sanitation"] },
  { name: "Community Services", description: "Neighbourhood facilities, public safety concerns, and local support.", categories: ["Community facility", "Public safety concern", "Parks and recreation", "Other community issue"] },
];

export async function ensureInitialCatalog() {
  if (!_db) return;
  const existingDepartments = await _db.select().from(departments);
  if (existingDepartments.length >= starterCatalog.length) return;

  const now = new Date();
  for (const dept of starterCatalog) {
    const existingDept = await _db.select().from(departments).where(eq(departments.name, dept.name)).limit(1);
    let deptId = existingDept[0]?.id;
    if (!deptId) {
      await _db.insert(departments).values({
        name: dept.name,
        description: dept.description,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      const inserted = await _db.select().from(departments).where(eq(departments.name, dept.name)).limit(1);
      deptId = inserted[0]?.id;
    }
    if (deptId) {
      for (const catName of dept.categories) {
        const existingCat = await _db.select().from(grievanceCategories).where(and(eq(grievanceCategories.departmentId, deptId), eq(grievanceCategories.name, catName))).limit(1);
        if (!existingCat[0]) {
          await _db.insert(grievanceCategories).values({
            name: catName,
            departmentId: deptId,
            description: `${catName} service request`,
            status: "active",
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  }
}

export async function getPublicServiceActor() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const openId = "civicresolve-public-service";
  const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (existing[0]) return existing[0].id;
  const now = new Date();
  await db.insert(users).values({ openId, name: "Public portal activity", loginMethod: "public", role: "user", createdAt: now, updatedAt: now, lastSignedIn: now });
  const actor = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!actor[0]) throw new Error("Could not initialize public service access.");
  return actor[0].id;
}

export async function submitPublicFeedback(input: { trackingNumber: string; rating: number; comment?: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  const record = await database.select().from(grievances).where(eq(grievances.trackingNumber, input.trackingNumber.toUpperCase())).limit(1);
  if (!record[0]) throw new Error("Grievance not found.");
  if (!["resolved", "closed"].includes(record[0].status)) throw new Error("Feedback becomes available once a grievance is resolved.");
  const actorId = await getPublicServiceActor();
  const existing = await database.select().from(feedback).where(eq(feedback.grievanceId, record[0].id)).limit(1);
  if (existing[0]) throw new Error("Feedback has already been recorded for this case.");
  await database.insert(feedback).values({ grievanceId: record[0].id, userId: actorId, rating: input.rating, comment: input.comment || null, createdAt: new Date() });
  return { success: true };
}

export async function logEmailNotificationAttempt(input: { userId: number; grievanceId: number; recipient: string; event: string; trackingNumber: string }) {
  try {
    const database = await getDb();
    if (!database) return;
    await database.insert(notifications).values({ userId: input.userId, grievanceId: input.grievanceId, title: `Email update ${input.event}`, message: `Logged email notification attempt for ${input.recipient} regarding ${input.trackingNumber}.`, type: "email_attempt", createdAt: new Date() });
  } catch (error) {
    console.warn("[Notifications] Email attempt log failed:", error);
  }
}

export async function createGrievanceRecord(input: {
  userId: number;
  categoryId: number;
  departmentId: number;
  title: string;
  description: string;
  location?: string;
  contactEmail?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const category = await db
    .select()
    .from(grievanceCategories)
    .where(
      and(
        eq(grievanceCategories.id, input.categoryId),
        eq(grievanceCategories.departmentId, input.departmentId),
        eq(grievanceCategories.status, "active"),
      ),
    )
    .limit(1);
  if (!category[0]) throw new Error("Choose an active category that belongs to the selected department.");
  const department = await db.select({ slaHours: departments.slaHours }).from(departments).where(and(eq(departments.id, input.departmentId), eq(departments.status, "active"))).limit(1);
  if (!department[0]) throw new Error("Choose an active service department.");
  const dueAt = new Date(Date.now() + department[0].slaHours * 60 * 60 * 1000);

  const year = new Date().getUTCFullYear();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const countResult = await db
      .select({ total: sql<number>`count(*)` })
      .from(grievances)
      .where(like(grievances.trackingNumber, `GRV-${year}-%`));
    const serial = Number(countResult[0]?.total ?? 0) + 1 + attempt;
    const trackingNumber = `GRV-${year}-${String(serial).padStart(5, "0")}`;
    try {
      const now = new Date();
      await db.insert(grievances).values({
        trackingNumber,
        userId: input.userId,
        categoryId: input.categoryId,
        departmentId: input.departmentId,
        title: input.title,
        description: input.description,
        location: input.location || null,
        contactEmail: input.contactEmail?.toLowerCase() || null,
        priority: "medium",
        status: "submitted",
        dueAt,
        createdAt: now,
        updatedAt: now,
      });

      const inserted = await db.select().from(grievances).where(eq(grievances.trackingNumber, trackingNumber)).limit(1);
      const grievanceId = inserted[0].id;

      await db.insert(grievanceHistory).values({
        grievanceId,
        previousStatus: null,
        newStatus: "submitted",
        activityType: "submitted",
        remarks: "Grievance received through the citizen portal.",
        changedByUserId: input.userId,
        createdAt: now,
      });
      await db.insert(notifications).values({
        userId: input.userId,
        grievanceId,
        title: "Grievance submitted",
        message: `Your grievance ${trackingNumber} has been received.`,
        type: "submitted",
        createdAt: now,
      });
      if (input.contactEmail) {
        await db.insert(notifications).values({ userId: input.userId, grievanceId, title: "Email update submitted", message: `Logged email notification attempt for ${input.contactEmail} regarding ${trackingNumber}.`, type: "email_attempt", createdAt: now });
      }
      return { id: grievanceId, trackingNumber };
    } catch (error: any) {
      if (!error?.message?.includes("UNIQUE constraint failed") && error?.code !== "ER_DUP_ENTRY" && error?.errno !== 1062) {
        throw error;
      }
    }
  }
  throw new Error("Could not generate a unique tracking ID. Please try again.");
}

export async function listGrievancesForUser(userId: number, query?: string) {
  const db = await getDb();
  if (!db) return [];
  const condition = query
    ? and(eq(grievances.userId, userId), like(grievances.trackingNumber, `%${query}%`))
    : eq(grievances.userId, userId);
  return db
    .select({ grievance: grievances, department: departments, category: grievanceCategories })
    .from(grievances)
    .innerJoin(departments, eq(grievances.departmentId, departments.id))
    .innerJoin(grievanceCategories, eq(grievances.categoryId, grievanceCategories.id))
    .where(condition)
    .orderBy(desc(grievances.updatedAt));
}

export async function getGrievanceDetail(grievanceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const main = await db
    .select({
      grievance: grievances,
      department: departments,
      category: grievanceCategories,
      citizen: { id: users.id, name: users.name, email: users.email },
    })
    .from(grievances)
    .innerJoin(departments, eq(grievances.departmentId, departments.id))
    .innerJoin(grievanceCategories, eq(grievances.categoryId, grievanceCategories.id))
    .innerJoin(users, eq(grievances.userId, users.id))
    .where(eq(grievances.id, grievanceId))
    .limit(1);
  if (!main[0]) return undefined;

  const [history, attachedFiles, response] = await Promise.all([
    db
      .select({ history: grievanceHistory, actor: { id: users.id, name: users.name } })
      .from(grievanceHistory)
      .innerJoin(users, eq(grievanceHistory.changedByUserId, users.id))
      .where(eq(grievanceHistory.grievanceId, grievanceId))
      .orderBy(desc(grievanceHistory.createdAt)),
    db.select().from(attachments).where(eq(attachments.grievanceId, grievanceId)),
    db.select().from(feedback).where(eq(feedback.grievanceId, grievanceId)).limit(1),
  ]);
  let officer: { id: number; name: string | null; email: string | null } | undefined;
  if (main[0].grievance.assignedOfficerId) {
    const assigned = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, main[0].grievance.assignedOfficerId))
      .limit(1);
    officer = assigned[0];
  }
  return { ...main[0], officer, history, attachments: attachedFiles, feedback: response[0] };
}

export async function getGrievanceDetailByTracking(trackingNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const record = await db.select({ id: grievances.id }).from(grievances).where(eq(grievances.trackingNumber, trackingNumber.toUpperCase())).limit(1);
  return record[0] ? getGrievanceDetail(record[0].id) : undefined;
}

export type AssignedQueueRecord = {
  grievance: { priority: GrievancePriority; status: GrievanceStatus; updatedAt: Date };
};

export type QueueFilter = {
  search?: string;
  status?: GrievanceStatus;
  priority?: GrievancePriority;
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
  sort?: "updated_desc" | "updated_asc" | "priority_desc" | "priority_asc" | "status_asc";
  limit?: number;
  offset?: number;
  overdue?: boolean;
};

export function sortAssignedGrievances<T extends AssignedQueueRecord>(results: T[], sort?: "updated_desc" | "updated_asc" | "priority_desc" | "priority_asc" | "status_asc") {
  const priorityRank: Record<GrievancePriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  if (sort === "updated_asc") return results.sort((a, b) => a.grievance.updatedAt.getTime() - b.grievance.updatedAt.getTime());
  if (sort === "priority_desc") return results.sort((a, b) => priorityRank[b.grievance.priority] - priorityRank[a.grievance.priority]);
  if (sort === "priority_asc") return results.sort((a, b) => priorityRank[a.grievance.priority] - priorityRank[b.grievance.priority]);
  if (sort === "status_asc") return results.sort((a, b) => a.grievance.status.localeCompare(b.grievance.status));
  return results;
}

export function isStaffCaseVisible(record: { assignedOfficerId: number | null; departmentId: number }, userId: number, role: "officer" | "admin", departmentId?: number | null) {
  return role === "admin" || record.assignedOfficerId === userId || (departmentId != null && record.departmentId === departmentId);
}

export async function listAssignedGrievances(officerId: number, filter?: QueueFilter, role: "officer" | "admin" = "officer", departmentId?: number | null, databaseOverride?: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const db = databaseOverride ?? await getDb();
  if (!db) return [];
  const scope = role === "admin"
    ? undefined
    : or(eq(grievances.assignedOfficerId, officerId), ...(departmentId ? [eq(grievances.departmentId, departmentId)] : []));
  const conditions = scope ? [scope] : [];
  if (filter?.status) conditions.push(eq(grievances.status, filter.status));
  if (filter?.priority) conditions.push(eq(grievances.priority, filter.priority));
  if (filter?.categoryId) conditions.push(eq(grievances.categoryId, filter.categoryId));
  if (filter?.search) {
    const pattern = `%${filter.search}%`;
    const textMatch = or(like(grievances.trackingNumber, pattern), like(grievances.title, pattern), like(grievances.location, pattern));
    if (textMatch) conditions.push(textMatch);
  }
  if (filter?.dateFrom) conditions.push(gte(grievances.updatedAt, new Date(`${filter.dateFrom}T00:00:00.000Z`)));
  if (filter?.dateTo) conditions.push(lte(grievances.updatedAt, new Date(`${filter.dateTo}T23:59:59.999Z`)));
  if (filter?.overdue) conditions.push(lte(grievances.dueAt, new Date()), notInArray(grievances.status, ["resolved", "closed"]), isNull(grievances.escalatedAt));
  const results = await db
    .select({ grievance: grievances, department: departments, category: grievanceCategories })
    .from(grievances)
    .innerJoin(departments, eq(grievances.departmentId, departments.id))
    .innerJoin(grievanceCategories, eq(grievances.categoryId, grievanceCategories.id))
    .where(and(...conditions))
    .orderBy(desc(grievances.updatedAt))
    .limit(Math.min(filter?.limit ?? 25, 100))
    .offset(filter?.offset ?? 0);
  return sortAssignedGrievances(results.filter(result => isStaffCaseVisible(result.grievance, officerId, role, departmentId)), filter?.sort);
}

export const PUBLIC_SUGGESTION_LIMIT = 8;

export function normalizePublicSuggestion(search: string) {
  const normalized = search.trim().slice(0, 80);
  return normalized.length >= 2 ? normalized : null;
}

export type PublicSuggestionRow = { trackingNumber: string; title: string; location: string | null; status: GrievanceStatus; departmentName: string };

export function shapePublicSuggestionRows(rows: PublicSuggestionRow[], search: string) {
  const normalized = normalizePublicSuggestion(search)?.toLowerCase();
  if (!normalized) return [];
  return rows
    .filter(row => [row.trackingNumber, row.title, row.location || ""].some(value => value.toLowerCase().includes(normalized)))
    .slice(0, PUBLIC_SUGGESTION_LIMIT);
}

export function shapeInternalSuggestionRows(rows: Array<PublicSuggestionRow & { assignedOfficerId: number | null; departmentId: number }>, search: string, userId: number, role: "officer" | "admin", departmentId?: number | null) {
  return shapePublicSuggestionRows(rows.filter(row => isStaffCaseVisible(row, userId, role, departmentId)), search);
}

export async function suggestInternalGrievances(search: string, userId: number, role: "officer" | "admin", departmentId?: number | null) {
  const database = await getDb();
  const normalized = normalizePublicSuggestion(search);
  if (!database || !normalized) return [];
  const pattern = `%${normalized}%`;
  const textMatch = or(like(grievances.trackingNumber, pattern), like(grievances.title, pattern), like(grievances.location, pattern));
  const scope = role === "admin" ? undefined : or(eq(grievances.assignedOfficerId, userId), ...(departmentId ? [eq(grievances.departmentId, departmentId)] : []));
  const rows = await database
    .select({ trackingNumber: grievances.trackingNumber, title: grievances.title, location: grievances.location, status: grievances.status, departmentName: departments.name, assignedOfficerId: grievances.assignedOfficerId, departmentId: grievances.departmentId })
    .from(grievances)
    .innerJoin(departments, eq(grievances.departmentId, departments.id))
    .where(scope ? and(textMatch, scope) : textMatch)
    .orderBy(desc(grievances.updatedAt))
    .limit(PUBLIC_SUGGESTION_LIMIT);
  return shapeInternalSuggestionRows(rows, normalized, userId, role, departmentId);
}

export function isSlaOverdue(grievance: { dueAt: Date | null; escalatedAt: Date | null; status: GrievanceStatus }, now = new Date()) {
  return Boolean(grievance.dueAt && grievance.dueAt <= now && !grievance.escalatedAt && !["resolved", "closed", "escalated"].includes(grievance.status));
}

export function buildSlaEscalationUpdate(now = new Date()) {
  return { status: "escalated" as const, priority: "critical" as const, escalatedAt: now };
}

export async function escalateOverdueGrievances(now = new Date()) {
  const db = await getDb();
  if (!db) return { updated: 0, grievanceIds: [] as number[] };
  const overdue = await db.select().from(grievances).where(and(lte(grievances.dueAt, now), isNull(grievances.escalatedAt), notInArray(grievances.status, ["resolved", "closed", "escalated"]))).limit(100);
  if (!overdue.length) return { updated: 0, grievanceIds: [] as number[] };
  for (const grievance of overdue) {
    await db.update(grievances).set({ ...buildSlaEscalationUpdate(now), updatedAt: now }).where(and(eq(grievances.id, grievance.id), isNull(grievances.escalatedAt)));
    await db.insert(grievanceHistory).values({ grievanceId: grievance.id, previousStatus: grievance.status, newStatus: "escalated", activityType: "sla_escalation", remarks: "Case escalated automatically after its service deadline elapsed.", actionTaken: "Priority raised to critical for overdue handling.", changedByUserId: grievance.assignedOfficerId ?? grievance.userId, createdAt: now });
    if (grievance.assignedOfficerId) {
      await db.insert(notifications).values({ userId: grievance.assignedOfficerId, grievanceId: grievance.id, title: "SLA escalation", message: `Case ${grievance.trackingNumber} is overdue and requires attention.`, type: "sla_escalation", createdAt: now });
    }
  }
  return { updated: overdue.length, grievanceIds: overdue.map(grievance => grievance.id) };
}

export function buildBulkPrioritySideEffects(current: Array<{ id: number; userId: number; trackingNumber: string; status: GrievanceStatus }>, priority: GrievancePriority, changedByUserId: number) {
  return {
    history: current.map(item => ({
      grievanceId: item.id,
      previousStatus: item.status,
      newStatus: item.status,
      activityType: "priority_change",
      remarks: `Priority changed to ${priority} through the officer queue.`,
      changedByUserId,
    })),
    notifications: current.map(item => ({
      userId: item.userId,
      grievanceId: item.id,
      title: "Grievance priority updated",
      message: `${item.trackingNumber} has been marked ${priority} priority.`,
      type: "priority_change",
    })),
  };
}

export async function updateGrievancePriorityBatch(input: {
  grievanceIds: number[];
  priority: GrievancePriority;
  changedByUserId: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  const current = await database.select().from(grievances).where(inArray(grievances.id, input.grievanceIds));
  if (current.length !== input.grievanceIds.length) throw new Error("One or more selected grievances could not be found.");
  const effects = buildBulkPrioritySideEffects(current, input.priority, input.changedByUserId);
  const now = new Date();
  await database.update(grievances).set({ priority: input.priority, updatedAt: now }).where(inArray(grievances.id, input.grievanceIds));
  for (const h of effects.history) await database.insert(grievanceHistory).values({ ...h, createdAt: now });
  for (const n of effects.notifications) await database.insert(notifications).values({ ...n, createdAt: now });
}

export async function updateGrievanceWorkflow(input: {
  grievanceId: number;
  nextStatus: GrievanceStatus;
  remarks?: string;
  actionTaken?: string;
  resolutionDetails?: string;
  changedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await db.select().from(grievances).where(eq(grievances.id, input.grievanceId)).limit(1);
  if (!current[0]) throw new Error("Grievance not found.");
  const now = new Date();
  await db
    .update(grievances)
    .set({
      status: input.nextStatus,
      resolutionDetails: input.resolutionDetails || current[0].resolutionDetails,
      resolvedAt: input.nextStatus === "resolved" ? now : current[0].resolvedAt,
      closedAt: input.nextStatus === "closed" ? now : current[0].closedAt,
      updatedAt: now,
    })
    .where(eq(grievances.id, input.grievanceId));

  await db.insert(grievanceHistory).values({
    grievanceId: input.grievanceId,
    previousStatus: current[0].status,
    newStatus: input.nextStatus,
    activityType: "status_change",
    remarks: input.remarks || null,
    actionTaken: input.actionTaken || null,
    changedByUserId: input.changedByUserId,
    createdAt: now,
  });

  await db.insert(notifications).values({
    userId: current[0].userId,
    grievanceId: input.grievanceId,
    title: `Grievance ${input.nextStatus.replace("_", " ")}`,
    message: `${current[0].trackingNumber} has been updated to ${input.nextStatus.replace("_", " ")}.`,
    type: input.nextStatus,
    createdAt: now,
  });

  if (current[0].contactEmail) {
    await logEmailNotificationAttempt({ userId: current[0].userId, grievanceId: input.grievanceId, recipient: current[0].contactEmail, event: input.nextStatus, trackingNumber: current[0].trackingNumber });
  }
}

export async function addGrievanceProgress(input: {
  grievanceId: number;
  remarks?: string;
  actionTaken?: string;
  changedByUserId: number;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  const current = await database.select().from(grievances).where(eq(grievances.id, input.grievanceId)).limit(1);
  if (!current[0]) throw new Error("Grievance not found.");
  const now = new Date();
  await database.insert(grievanceHistory).values({
    grievanceId: input.grievanceId,
    previousStatus: current[0].status,
    newStatus: current[0].status,
    activityType: "progress_update",
    remarks: input.remarks || null,
    actionTaken: input.actionTaken || null,
    changedByUserId: input.changedByUserId,
    createdAt: now,
  });
  await database.insert(notifications).values({
    userId: current[0].userId,
    grievanceId: input.grievanceId,
    title: "Progress update added",
    message: `${current[0].trackingNumber} has a new progress update from the responsible department.`,
    type: "progress_update",
    createdAt: now,
  });
  if (current[0].contactEmail) {
    await logEmailNotificationAttempt({ userId: current[0].userId, grievanceId: input.grievanceId, recipient: current[0].contactEmail, event: "progress", trackingNumber: current[0].trackingNumber });
  }
}

export async function getAdminDashboardData() {
  const db = await getDb();
  if (!db) return { total: 0, openTotal: 0, statusCounts: [], byDepartment: [], byCategory: [], workload: [], feedback: { responses: 0, averageRating: 0 }, sla: { overdue: 0, escalated: 0 }, averageResolutionHours: 0 };
  
  const allGrievances = await db.select().from(grievances);
  const allDepartments = await db.select().from(departments);
  const allCategories = await db.select().from(grievanceCategories);
  const allUsers = await db.select().from(users);
  const allFeedback = await db.select().from(feedback);

  const total = allGrievances.length;
  const statusMap = new Map<string, number>();
  const deptMap = new Map<number, number>();
  const catMap = new Map<number, number>();
  const officerMap = new Map<number, number>();
  let overdue = 0;
  let escalated = 0;
  let totalResolutionHours = 0;
  let resolvedCount = 0;
  const now = new Date();

  for (const g of allGrievances) {
    statusMap.set(g.status, (statusMap.get(g.status) || 0) + 1);
    deptMap.set(g.departmentId, (deptMap.get(g.departmentId) || 0) + 1);
    catMap.set(g.categoryId, (catMap.get(g.categoryId) || 0) + 1);
    if (g.assignedOfficerId) {
      officerMap.set(g.assignedOfficerId, (officerMap.get(g.assignedOfficerId) || 0) + 1);
    }
    if (g.dueAt && g.dueAt < now && !["resolved", "closed"].includes(g.status)) {
      overdue += 1;
    }
    if (g.status === "escalated") {
      escalated += 1;
    }
    if (g.resolvedAt && g.createdAt) {
      const diffHours = (g.resolvedAt.getTime() - g.createdAt.getTime()) / (1000 * 60 * 60);
      totalResolutionHours += Math.max(0, diffHours);
      resolvedCount += 1;
    }
  }

  const statusCounts = Array.from(statusMap.entries()).map(([status, count]) => ({ status, total: count }));
  const openTotal = statusCounts.reduce((sum, row) => sum + (["resolved", "closed"].includes(row.status) ? 0 : row.total), 0);

  const byDepartment = allDepartments
    .map(d => ({ label: d.name, total: deptMap.get(d.id) || 0 }))
    .filter(d => d.total > 0);

  const byCategory = allCategories
    .map(c => ({ label: c.name, total: catMap.get(c.id) || 0 }))
    .filter(c => c.total > 0);

  const workload = allUsers
    .filter(u => officerMap.has(u.id))
    .map(u => ({ label: u.name || u.email || `Officer #${u.id}`, total: officerMap.get(u.id) || 0 }));

  const averageRating = allFeedback.length > 0 ? (allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length) : 0;

  return {
    total,
    openTotal,
    statusCounts,
    byDepartment,
    byCategory,
    workload,
    feedback: {
      responses: allFeedback.length,
      averageRating: Number(averageRating.toFixed(1)),
    },
    sla: { overdue, escalated },
    averageResolutionHours: resolvedCount > 0 ? Math.round(totalResolutionHours / resolvedCount) : 0,
  };
}

export async function listAllGrievances(filter?: { search?: string; status?: GrievanceStatus }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [] as any[];
  if (filter?.search) conditions.push(like(grievances.trackingNumber, `%${filter.search}%`));
  if (filter?.status) conditions.push(eq(grievances.status, filter.status));
  return db
    .select({ grievance: grievances, department: departments, category: grievanceCategories, citizen: { id: users.id, name: users.name, email: users.email } })
    .from(grievances)
    .innerJoin(departments, eq(grievances.departmentId, departments.id))
    .innerJoin(grievanceCategories, eq(grievances.categoryId, grievanceCategories.id))
    .innerJoin(users, eq(grievances.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(grievances.updatedAt));
}
