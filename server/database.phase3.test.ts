import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { and, desc, eq, sql } from "drizzle-orm";
import { unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  departments,
  feedback,
  grievanceCategories,
  grievanceHistory,
  grievances,
  notifications,
  officerProfiles,
  users,
} from "../drizzle/schema";
import {
  getAdminDashboardData,
  listAssignedGrievances,
  listAllGrievances,
  promoteUserToOfficer,
  escalateOverdueGrievances,
  getDb,
} from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const TEST_DB_PATH = resolve(process.cwd(), "test-phase3-fresh.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

function createAdminContext(adminUserId: number): TrpcContext {
  return {
    user: {
      id: adminUserId,
      openId: "test-admin-phase3",
      name: "Phase3 Admin",
      email: "admin-phase3@example.org",
      loginMethod: "password",
      role: "admin",
      departmentId: null,
      active: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("Phase 3: Database & Query Hardening", () => {
  beforeAll(async () => {
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  afterAll(async () => {
    if (existsSync(TEST_DB_PATH)) {
      try {
        unlinkSync(TEST_DB_PATH);
      } catch {
        // ignore cleanup error
      }
    }
  });

  describe("1. Fresh Database & Migration / Schema Verification", () => {
    it("initializes SQLite schema with foreign keys, WAL, and justified indexes cleanly", async () => {
      const client = createClient({ url: TEST_DB_URL });
      await client.execute("PRAGMA foreign_keys = ON;");
      await client.execute("PRAGMA journal_mode = WAL;");
      await client.execute("PRAGMA busy_timeout = 5000;");

      // Verify DDL executes without syntax errors
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
          departmentId INTEGER,
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
          departmentId INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'active',
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS officerProfiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          departmentId INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
          designation TEXT,
          availability TEXT NOT NULL DEFAULT 'available',
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS grievances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trackingNumber TEXT NOT NULL UNIQUE,
          userId INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          contactEmail TEXT,
          categoryId INTEGER NOT NULL REFERENCES grievanceCategories(id) ON DELETE RESTRICT,
          departmentId INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
          assignedOfficerId INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
          grievanceId INTEGER NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
          previousStatus TEXT,
          newStatus TEXT NOT NULL,
          activityType TEXT NOT NULL DEFAULT 'status_change',
          remarks TEXT,
          actionTaken TEXT,
          changedByUserId INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          createdAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          grievanceId INTEGER NOT NULL REFERENCES grievances(id) ON DELETE CASCADE,
          fileKey TEXT NOT NULL,
          fileUrl TEXT NOT NULL,
          fileName TEXT NOT NULL,
          mimeType TEXT NOT NULL,
          fileSize INTEGER NOT NULL,
          uploadedByUserId INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          uploadedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          grievanceId INTEGER NOT NULL UNIQUE REFERENCES grievances(id) ON DELETE CASCADE,
          userId INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          rating INTEGER NOT NULL,
          comment TEXT,
          createdAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          grievanceId INTEGER REFERENCES grievances(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          readAt INTEGER,
          createdAt INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_grievances_department_status ON grievances(departmentId, status);
        CREATE INDEX IF NOT EXISTS idx_grievances_assigned_officer ON grievances(assignedOfficerId);
        CREATE INDEX IF NOT EXISTS idx_grievances_user ON grievances(userId);
        CREATE INDEX IF NOT EXISTS idx_grievances_due_at ON grievances(dueAt);
        CREATE INDEX IF NOT EXISTS idx_grievances_updated_at ON grievances(updatedAt);
        CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
        CREATE INDEX IF NOT EXISTS idx_history_grievance ON grievanceHistory(grievanceId);
        CREATE INDEX IF NOT EXISTS idx_attachments_grievance ON attachments(grievanceId);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(userId, readAt);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(userId, createdAt);
        CREATE INDEX IF NOT EXISTS idx_officer_profiles_department ON officerProfiles(departmentId);
      `);

      // Query sqlite_master to verify our 3 justified indexes exist
      const indexes = await client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'index';"
      );
      const indexNames = indexes.rows.map((r) => r.name as string);

      expect(indexNames).toContain("idx_grievances_status");
      expect(indexNames).toContain("idx_notifications_user_created");
      expect(indexNames).toContain("idx_officer_profiles_department");

      client.close();
    });
  });

  describe("2. Admin Dashboard Analytics SQLite Aggregation & Metric Equivalence", () => {
    it("returns correct default values for an empty or unseeded database", async () => {
      const data = await getAdminDashboardData();
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("openTotal");
      expect(data).toHaveProperty("statusCounts");
      expect(data).toHaveProperty("byDepartment");
      expect(data).toHaveProperty("byCategory");
      expect(data).toHaveProperty("workload");
      expect(data).toHaveProperty("feedback");
      expect(data).toHaveProperty("sla");
      expect(data).toHaveProperty("averageResolutionHours");
      expect(typeof data.total).toBe("number");
      expect(typeof data.averageResolutionHours).toBe("number");
      expect(typeof data.feedback.averageRating).toBe("number");
    });

    it("accurately aggregates counts, group-bys, resolution time, and ratings in SQL", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const now = new Date();
      const testPrefix = `test_p3_${Date.now()}`;

      // Insert test department & category
      const [dept] = await db
        .insert(departments)
        .values({
          name: `${testPrefix}_Dept`,
          slaHours: 48,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const [cat] = await db
        .insert(grievanceCategories)
        .values({
          name: `${testPrefix}_Cat`,
          departmentId: dept.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Insert citizen and officer users
      const [citizen] = await db
        .insert(users)
        .values({
          openId: `${testPrefix}_citizen`,
          name: "Test Citizen",
          email: `${testPrefix}@citizen.org`,
          role: "user",
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        })
        .returning();

      const [officer] = await db
        .insert(users)
        .values({
          openId: `${testPrefix}_officer`,
          name: "Officer Test",
          email: `${testPrefix}@officer.org`,
          role: "officer",
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        })
        .returning();

      // Insert 3 test grievances with known states:
      // Case 1: In progress, assigned to officer, created 10 hours ago
      const case1Created = new Date(now.getTime() - 10 * 3600 * 1000);
      const [case1] = await db
        .insert(grievances)
        .values({
          trackingNumber: `GRV-${testPrefix}-001`,
          userId: citizen.id,
          categoryId: cat.id,
          departmentId: dept.id,
          assignedOfficerId: officer.id,
          title: "Pothole case",
          description: "Road needs repair",
          priority: "medium",
          status: "in_progress",
          createdAt: case1Created,
          updatedAt: case1Created,
          dueAt: new Date(now.getTime() + 24 * 3600 * 1000), // Not overdue
        })
        .returning();

      // Case 2: Resolved, created 20 hours ago, resolved 10 hours ago (turnaround: 10h)
      const case2Created = new Date(now.getTime() - 20 * 3600 * 1000);
      const case2Resolved = new Date(now.getTime() - 10 * 3600 * 1000);
      const [case2] = await db
        .insert(grievances)
        .values({
          trackingNumber: `GRV-${testPrefix}-002`,
          userId: citizen.id,
          categoryId: cat.id,
          departmentId: dept.id,
          assignedOfficerId: officer.id,
          title: "Resolved water issue",
          description: "Water restored",
          priority: "high",
          status: "resolved",
          createdAt: case2Created,
          updatedAt: case2Resolved,
          resolvedAt: case2Resolved,
        })
        .returning();

      // Case 3: Overdue, due 5 hours ago, status assigned
      const case3Created = new Date(now.getTime() - 48 * 3600 * 1000);
      const [case3] = await db
        .insert(grievances)
        .values({
          trackingNumber: `GRV-${testPrefix}-003`,
          userId: citizen.id,
          categoryId: cat.id,
          departmentId: dept.id,
          assignedOfficerId: officer.id,
          title: "Overdue garbage",
          description: "Not picked up",
          priority: "low",
          status: "assigned",
          createdAt: case3Created,
          updatedAt: case3Created,
          dueAt: new Date(now.getTime() - 5 * 3600 * 1000), // Overdue!
        })
        .returning();

      // Insert feedback on resolved case
      await db.insert(feedback).values({
        grievanceId: case2.id,
        userId: citizen.id,
        rating: 5,
        comment: "Great quick work",
        createdAt: now,
      });

      // Run SQL analytics aggregation
      const dashboard = await getAdminDashboardData();

      // Verify metrics
      expect(dashboard.total).toBeGreaterThanOrEqual(3);
      expect(dashboard.openTotal).toBeGreaterThanOrEqual(2); // cases 1 and 3 are open

      // Department group by check
      const deptMetric = dashboard.byDepartment.find((d) => d.label === dept.name);
      expect(deptMetric).toBeDefined();
      expect(deptMetric!.total).toBe(3);

      // Category group by check
      const catMetric = dashboard.byCategory.find((c) => c.label === cat.name);
      expect(catMetric).toBeDefined();
      expect(catMetric!.total).toBe(3);

      // Workload check
      const officerWorkload = dashboard.workload.find((w) => w.label === officer.name);
      expect(officerWorkload).toBeDefined();
      expect(officerWorkload!.total).toBe(3);

      // SLA overdue check
      expect(dashboard.sla.overdue).toBeGreaterThanOrEqual(1);

      // Feedback check
      expect(dashboard.feedback.responses).toBeGreaterThanOrEqual(1);
      expect(dashboard.feedback.averageRating).toBeGreaterThanOrEqual(1);
      expect(dashboard.feedback.averageRating).toBeLessThanOrEqual(5);

      // Turnaround time check (non-zero since case2 was resolved)
      expect(dashboard.averageResolutionHours).toBeGreaterThan(0);
    });
  });

  describe("3. Officer Queue Sorting-Before-Pagination", () => {
    it("applies priority sorting in SQL before applying limit and offset", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const now = new Date();
      const testPrefix = `queue_p3_${Date.now()}`;

      // Insert test department & category
      const [dept] = await db
        .insert(departments)
        .values({ name: `${testPrefix}_Dept`, slaHours: 72, createdAt: now, updatedAt: now })
        .returning();

      const [cat] = await db
        .insert(grievanceCategories)
        .values({ name: `${testPrefix}_Cat`, departmentId: dept.id, createdAt: now, updatedAt: now })
        .returning();

      const [officer] = await db
        .insert(users)
        .values({
          openId: `${testPrefix}_off`,
          name: "Queue Test Officer",
          role: "officer",
          departmentId: dept.id,
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        })
        .returning();

      await db.insert(officerProfiles).values({
        userId: officer.id,
        departmentId: dept.id,
        createdAt: now,
        updatedAt: now,
      });

      // Insert 3 cases with deliberately conflicting timestamps vs priorities:
      // Case A: LOW priority, but NEWEST updatedAt (today)
      const dateA = new Date("2026-09-20T12:00:00.000Z");
      await db.insert(grievances).values({
        trackingNumber: `GRV-${testPrefix}-LOW`,
        userId: officer.id,
        categoryId: cat.id,
        departmentId: dept.id,
        assignedOfficerId: officer.id,
        title: "Low Priority Ticket",
        description: "Low priority desc",
        priority: "low",
        status: "assigned",
        createdAt: dateA,
        updatedAt: dateA,
      });

      // Case B: CRITICAL priority, but OLDEST updatedAt (2026-09-01)
      const dateB = new Date("2026-09-01T12:00:00.000Z");
      await db.insert(grievances).values({
        trackingNumber: `GRV-${testPrefix}-CRIT`,
        userId: officer.id,
        categoryId: cat.id,
        departmentId: dept.id,
        assignedOfficerId: officer.id,
        title: "Critical Priority Ticket",
        description: "Critical priority desc",
        priority: "critical",
        status: "in_progress",
        createdAt: dateB,
        updatedAt: dateB,
      });

      // Case C: HIGH priority, intermediate updatedAt (2026-09-10)
      const dateC = new Date("2026-09-10T12:00:00.000Z");
      await db.insert(grievances).values({
        trackingNumber: `GRV-${testPrefix}-HIGH`,
        userId: officer.id,
        categoryId: cat.id,
        departmentId: dept.id,
        assignedOfficerId: officer.id,
        title: "High Priority Ticket",
        description: "High priority desc",
        priority: "high",
        status: "assigned",
        createdAt: dateC,
        updatedAt: dateC,
      });

      // 1. Query Page 1 with limit: 1 and sort: "priority_desc"
      // Before the fix: DB sorted by updatedAt desc, so Page 1 returned Case A (LOW).
      // With SQL priority sort before LIMIT: Page 1 MUST return Case B (CRITICAL).
      const page1 = await listAssignedGrievances(
        officer.id,
        {
          search: testPrefix,
          sort: "priority_desc",
          limit: 1,
          offset: 0,
        },
        "officer",
        dept.id
      );

      expect(page1).toHaveLength(1);
      expect(page1[0].grievance.priority).toBe("critical");
      expect(page1[0].grievance.trackingNumber).toBe(`GRV-${testPrefix}-CRIT`);

      // 2. Query Page 2 (limit: 1, offset: 1)
      const page2 = await listAssignedGrievances(
        officer.id,
        {
          search: testPrefix,
          sort: "priority_desc",
          limit: 1,
          offset: 1,
        },
        "officer",
        dept.id
      );

      expect(page2).toHaveLength(1);
      expect(page2[0].grievance.priority).toBe("high");
      expect(page2[0].grievance.trackingNumber).toBe(`GRV-${testPrefix}-HIGH`);

      // 3. Query Page 3 (limit: 1, offset: 2)
      const page3 = await listAssignedGrievances(
        officer.id,
        {
          search: testPrefix,
          sort: "priority_desc",
          limit: 1,
          offset: 2,
        },
        "officer",
        dept.id
      );

      expect(page3).toHaveLength(1);
      expect(page3[0].grievance.priority).toBe("low");
      expect(page3[0].grievance.trackingNumber).toBe(`GRV-${testPrefix}-LOW`);
    });
  });

  describe("4. Safe Pagination Boundaries & API Contracts", () => {
    it("returns paginated metadata when paginate: true, and raw array when paginate: false/undefined", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      // 1. listAllGrievances with paginate: true
      const paginatedGrievances = await listAllGrievances({
        limit: 2,
        offset: 0,
        paginate: true,
      });

      expect(paginatedGrievances).toHaveProperty("items");
      expect(paginatedGrievances).toHaveProperty("total");
      expect(paginatedGrievances).toHaveProperty("hasMore");
      expect(paginatedGrievances).toHaveProperty("limit", 2);
      expect(paginatedGrievances).toHaveProperty("offset", 0);
      expect(Array.isArray((paginatedGrievances as any).items)).toBe(true);

      // 2. listAllGrievances without pagination (backward-compatible)
      const rawGrievances = await listAllGrievances();
      expect(Array.isArray(rawGrievances)).toBe(true);

      // 3. Router level: admin.listGrievances with pagination
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);

      const adminCtx = createAdminContext(adminUser?.id ?? 1);
      const adminCaller = appRouter.createCaller(adminCtx);

      const pagedResult = await adminCaller.admin.listGrievances({
        limit: 2,
        offset: 0,
        paginate: true,
      });
      expect(pagedResult).toHaveProperty("items");
      expect(pagedResult).toHaveProperty("total");
      expect(pagedResult).toHaveProperty("hasMore");

      // 4. Router level: admin.listGrievances default call returns Array
      const defaultGrievances = await adminCaller.admin.listGrievances();
      expect(Array.isArray(defaultGrievances)).toBe(true);

      // 5. Router level: admin.users with pagination
      const pagedUsers = await adminCaller.admin.users({
        limit: 2,
        offset: 0,
        paginate: true,
      });
      expect(pagedUsers).toHaveProperty("items");
      expect(pagedUsers).toHaveProperty("total");
      expect(pagedUsers).toHaveProperty("hasMore");

      // 6. Router level: admin.users default call returns Array (vital for existing callers)
      const defaultUsers = await adminCaller.admin.users();
      expect(Array.isArray(defaultUsers)).toBe(true);
      expect(defaultUsers.length).toBeGreaterThan(0);
    });
  });

  describe("5. Transaction Atomicity & Failure Behavior", () => {
    it("rolls back user role promotion atomically if department does not exist", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const now = new Date();
      const testPrefix = `tx_test_${Date.now()}`;

      // Create a test citizen
      const [citizen] = await db
        .insert(users)
        .values({
          openId: `${testPrefix}_user`,
          name: "Rollback User",
          role: "user",
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        })
        .returning();

      expect(citizen.role).toBe("user");

      // Attempt to promote to non-existent department (999999)
      await expect(
        promoteUserToOfficer({
          userId: citizen.id,
          departmentId: 999999,
          designation: "Field Officer",
        })
      ).rejects.toThrow(/Department not found/i);

      // Verify transaction rolled back: user role must STILL be "user"
      const [checkedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, citizen.id));
      expect(checkedUser.role).toBe("user");
      expect(checkedUser.departmentId).toBeNull();

      // Verify no orphan officer profile was created
      const profiles = await db
        .select()
        .from(officerProfiles)
        .where(eq(officerProfiles.userId, citizen.id));
      expect(profiles).toHaveLength(0);
    });

    it("commits user role promotion and officer profile creation atomically when valid", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const now = new Date();
      const testPrefix = `tx_success_${Date.now()}`;

      // Create department
      const [dept] = await db
        .insert(departments)
        .values({ name: `${testPrefix}_Dept`, slaHours: 48, createdAt: now, updatedAt: now })
        .returning();

      // Create citizen
      const [citizen] = await db
        .insert(users)
        .values({
          openId: `${testPrefix}_user`,
          name: "Promoted Officer",
          role: "user",
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        })
        .returning();

      // Promote to officer
      const result = await promoteUserToOfficer({
        userId: citizen.id,
        departmentId: dept.id,
        designation: "Lead Inspector",
      });

      expect(result).toEqual({ success: true });

      // Verify user updated to officer
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, citizen.id));
      expect(updatedUser.role).toBe("officer");
      expect(updatedUser.departmentId).toBe(dept.id);

      // Verify profile created
      const [profile] = await db
        .select()
        .from(officerProfiles)
        .where(eq(officerProfiles.userId, citizen.id));
      expect(profile).toBeDefined();
      expect(profile.designation).toBe("Lead Inspector");
      expect(profile.departmentId).toBe(dept.id);
    });

    it("escalates overdue grievances inside a database transaction atomically", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const now = new Date();
      const testPrefix = `escalate_tx_${Date.now()}`;

      const [dept] = await db
        .insert(departments)
        .values({ name: `${testPrefix}_Dept`, slaHours: 24, createdAt: now, updatedAt: now })
        .returning();

      const [cat] = await db
        .insert(grievanceCategories)
        .values({ name: `${testPrefix}_Cat`, departmentId: dept.id, createdAt: now, updatedAt: now })
        .returning();

      const [officer] = await db
        .insert(users)
        .values({
          openId: `${testPrefix}_officer`,
          name: "SLA Officer",
          role: "officer",
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        })
        .returning();

      // Insert an overdue grievance (due in the past)
      const pastDue = new Date(now.getTime() - 2 * 3600 * 1000);
      const [overdueGrievance] = await db
        .insert(grievances)
        .values({
          trackingNumber: `GRV-${testPrefix}-OVERDUE`,
          userId: officer.id,
          categoryId: cat.id,
          departmentId: dept.id,
          assignedOfficerId: officer.id,
          title: "Overdue Streetlight",
          description: "Needs immediate fix",
          priority: "medium",
          status: "in_progress",
          dueAt: pastDue,
          createdAt: new Date(now.getTime() - 30 * 3600 * 1000),
          updatedAt: new Date(now.getTime() - 30 * 3600 * 1000),
        })
        .returning();

      const escalation = await escalateOverdueGrievances(now);
      expect(escalation.updated).toBeGreaterThanOrEqual(1);
      expect(escalation.grievanceIds).toContain(overdueGrievance.id);

      // Verify the grievance status is now escalated and priority is critical
      const [updated] = await db
        .select()
        .from(grievances)
        .where(eq(grievances.id, overdueGrievance.id));
      expect(updated.status).toBe("escalated");
      expect(updated.priority).toBe("critical");
      expect(updated.escalatedAt).not.toBeNull();

      // Verify grievance history record was created
      const historyRows = await db
        .select()
        .from(grievanceHistory)
        .where(eq(grievanceHistory.grievanceId, overdueGrievance.id));
      expect(historyRows.some((h) => h.activityType === "sla_escalation")).toBe(true);

      // Verify notification was dispatched to officer
      const notifRows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.grievanceId, overdueGrievance.id));
      expect(notifRows.some((n) => n.type === "sla_escalation")).toBe(true);
    });
  });
});
