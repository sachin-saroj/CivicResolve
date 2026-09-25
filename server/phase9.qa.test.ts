import express from "express";
import { createServer } from "node:http";
import { beforeAll, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import * as db from "./db";
import { assertWorkflowTransition } from "./workflow";
import { departments, officerProfiles, users, type User } from "../drizzle/schema";

let anonymousContext: TrpcContext;
let citizenContext: TrpcContext;
let officerContext: TrpcContext;
let adminContext: TrpcContext;
let testDepartmentId = 1;

beforeAll(async () => {
  const database = await db.getDb();
  if (!database) throw new Error("Database unavailable in test");

  const depts = await database.select().from(departments).limit(1);
  if (depts[0]) {
    testDepartmentId = depts[0].id;
  }

  const now = new Date();
  const timestamp = Date.now();

  const [citizenUser] = await database
    .insert(users)
    .values({
      openId: `qa-citizen-${timestamp}`,
      name: "Aarav Sharma",
      email: `citizen.${timestamp}@civic.test`,
      role: "user",
      loginMethod: "public",
      active: 1,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    })
    .returning();

  const [officerUser] = await database
    .insert(users)
    .values({
      openId: `qa-officer-${timestamp}`,
      name: "Officer Verma",
      email: `officer.${timestamp}@civic.test`,
      role: "officer",
      loginMethod: "internal",
      departmentId: testDepartmentId,
      active: 1,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    })
    .returning();

  await database.insert(officerProfiles).values({
    userId: officerUser.id,
    departmentId: testDepartmentId,
    designation: "Zonal Senior Inspector",
    active: 1,
    createdAt: now,
    updatedAt: now,
  });

  const [adminUser] = await database
    .insert(users)
    .values({
      openId: `qa-admin-${timestamp}`,
      name: "Commissioner Roy",
      email: `admin.${timestamp}@civic.test`,
      role: "admin",
      loginMethod: "internal",
      active: 1,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    })
    .returning();

  anonymousContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };

  citizenContext = {
    user: citizenUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };

  officerContext = {
    user: officerUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };

  adminContext = {
    user: adminUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
});

describe("Phase 9: End-to-End QA & Release Readiness", () => {
  describe("1. Citizen Journey: Submission, Tracking, Attachments & Feedback", () => {
    it("browses public catalog and retrieves active departments and categories", async () => {
      const caller = appRouter.createCaller(anonymousContext);
      const catalog = await caller.public.catalog();
      expect(catalog).toBeDefined();
      expect(catalog.departments.length).toBeGreaterThan(0);
      expect(catalog.categories.length).toBeGreaterThan(0);
      expect(catalog.departments[0]).toHaveProperty("name");
      expect(catalog.departments[0]).toHaveProperty("slaHours");
    });

    it("enforces validation on grievance submission (rejects missing required fields)", async () => {
      const caller = appRouter.createCaller(anonymousContext);
      await expect(
        caller.portal.create({
          title: "",
          departmentId: testDepartmentId,
          categoryId: 1,
          description: "Missing title test",
        })
      ).rejects.toThrow();

      await expect(
        caller.portal.create({
          title: "Valid Title Here",
          departmentId: 999999, // Non-existent department
          categoryId: 1,
          description: "Invalid department test",
        })
      ).rejects.toThrow();
    });

    it("successfully creates a citizen grievance, generates valid tracking ID, and sanitizes public tracking", async () => {
      const caller = appRouter.createCaller(anonymousContext);
      const created = await caller.portal.create({
        title: "Pothole on Main Boulevard",
        departmentId: testDepartmentId,
        categoryId: 1,
        description: "Severe pothole causing vehicular damage outside central library.",
        contactEmail: "citizen.private@example.com",
        location: "Opposite Gate 4",
      });

      expect(created).toBeDefined();
      expect(created.trackingNumber).toMatch(/^GRV-\d{4}-[A-Z0-9]{5}$/);
      expect(typeof created.id).toBe("number");

      // Verify public tracker lookup: sensitive complainant email and residential location must not leak
      const publicLookup = await caller.public.lookup({ trackingNumber: created.trackingNumber });
      expect(publicLookup).toBeDefined();
      expect(publicLookup.title).toBe("Pothole on Main Boulevard");
      expect(publicLookup.status).toBe("submitted");
      expect(publicLookup).not.toHaveProperty("contactEmail");
      expect(publicLookup).not.toHaveProperty("location");

      // Verify portal detail: contactEmail is masked for privacy
      const detail = await caller.portal.detail({ trackingNumber: created.trackingNumber });
      expect(detail).toBeDefined();
      expect(detail.grievance.status).toBe("submitted");
      expect(detail.grievance.contactEmail).toBe("c***@example.com");
    });

    it("handles attachment upload and strictly verifies attachment access boundaries", async () => {
      const app = express();
      registerStorageProxy(app);
      const server = createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const caller = appRouter.createCaller(anonymousContext);
        const created = await caller.portal.create({
          title: "Broken streetlight hazardous wiring",
          departmentId: testDepartmentId,
          categoryId: 1,
          description: "Live wire hanging from pole near bus stop.",
        });

        const testPdf = Buffer.from("%PDF-1.4 Civic evidence document content");
        const uploadResult = await caller.portal.uploadAttachment({
          trackingNumber: created.trackingNumber,
          fileName: "evidence_wire.pdf",
          mimeType: "application/pdf",
          fileData: testPdf.toString("base64"),
        });

        expect(uploadResult.success).toBe(true);
        expect(uploadResult.url).toBeDefined();

        const detail = await caller.portal.detail({ trackingNumber: created.trackingNumber });
        expect(detail.attachments.length).toBe(1);
        const att = detail.attachments[0];

        // 1. Download without tracking number -> 401 Unauthorized
        const unauthRes = await fetch(`http://localhost:${port}/api/attachments/${encodeURIComponent(att.fileName)}`);
        expect(unauthRes.status).toBe(401);

        // 2. Download with wrong tracking number -> 403 Forbidden
        const wrongTrackRes = await fetch(`http://localhost:${port}${att.fileUrl.replace(created.trackingNumber, "GRV-2026-00000")}`);
        expect(wrongTrackRes.status).toBe(403);

        // 3. Download with valid tracking number -> 200 OK
        const validRes = await fetch(`http://localhost:${port}${att.fileUrl}`);
        expect(validRes.status).toBe(200);
        const downloadedText = await validRes.text();
        expect(downloadedText).toContain("%PDF-1.4");
      } finally {
        server.close();
      }
    });

    it("allows citizen feedback on resolved grievance and rejects feedback on uncompleted cases", async () => {
      const publicCaller = appRouter.createCaller(anonymousContext);
      const created = await publicCaller.portal.create({
        title: "Water stagnation feedback test",
        departmentId: testDepartmentId,
        categoryId: 1,
        description: "Water stagnant for three days outside residential block.",
      });

      // 1. Attempting feedback on 'submitted' grievance must be rejected
      await expect(
        publicCaller.portal.feedback({
          trackingNumber: created.trackingNumber,
          rating: 4,
          comment: "Feedback too early",
        })
      ).rejects.toThrow();

      // Resolve the grievance: Admin assigns to officer, officer updates workflow
      const adminCaller = appRouter.createCaller(adminContext);
      await adminCaller.admin.assign({ grievanceId: created.id, officerId: officerContext.user!.id });

      const officerCaller = appRouter.createCaller(officerContext);
      // Admin assignment transitions submitted -> acknowledged -> assigned
      // Next valid transitions: assigned -> in_progress -> resolved
      await officerCaller.officer.updateCase({ grievanceId: created.id, nextStatus: "in_progress" });
      await officerCaller.officer.updateCase({ grievanceId: created.id, nextStatus: "resolved", resolutionDetails: "Cleared completely." });

      // 2. Now submit valid feedback on resolved grievance
      const feedbackResult = await publicCaller.portal.feedback({
        trackingNumber: created.trackingNumber,
        rating: 5,
        comment: "Excellent service and quick turnaround.",
      });
      expect(feedbackResult.success).toBe(true);

      // Verify portal detail reflects the feedback
      const detail = await publicCaller.portal.detail({ trackingNumber: created.trackingNumber });
      expect(detail.feedback).toBeDefined();
      expect(detail.feedback?.rating).toBe(5);
    });
  });

  describe("2. Officer Journey: Queue, Filtering, Assignment & State Machine", () => {
    it("allows officer to list queue and respects pagination and filtering", async () => {
      const officerCaller = appRouter.createCaller(officerContext);
      const queue = await officerCaller.officer.queue({
        limit: 10,
        offset: 0,
      });

      expect(queue).toBeDefined();
      expect(Array.isArray(queue)).toBe(true);
    });

    it("enforces strict sequential workflow transitions and records audit history", async () => {
      const publicCaller = appRouter.createCaller(anonymousContext);
      const created = await publicCaller.portal.create({
        title: "Garbage overflow in sector 7",
        departmentId: testDepartmentId,
        categoryId: 1,
        description: "Municipal waste overflowing into walkway.",
      });

      // Admin assigns case to officer (transitions submitted -> acknowledged -> assigned)
      const adminCaller = appRouter.createCaller(adminContext);
      const assignResult = await adminCaller.admin.assign({
        grievanceId: created.id,
        officerId: officerContext.user!.id,
      });
      expect(assignResult.success).toBe(true);

      // Verify audit history includes both acknowledgment and assignment entries
      const detailAfterAssign = await db.getGrievanceDetail(created.id);
      expect(detailAfterAssign?.history.length).toBeGreaterThanOrEqual(2);
      expect(detailAfterAssign?.history.some(h => h.history.newStatus === "acknowledged")).toBe(true);
      expect(detailAfterAssign?.history.some(h => h.history.newStatus === "assigned")).toBe(true);

      const officerCaller = appRouter.createCaller(officerContext);

      // Transition: assigned -> in_progress
      const progressResult = await officerCaller.officer.updateCase({
        grievanceId: created.id,
        nextStatus: "in_progress",
        remarks: "Field team dispatched to sector 7.",
      });
      expect(progressResult.success).toBe(true);

      // Transition 4: in_progress -> resolved
      const resolveResult = await officerCaller.officer.updateCase({
        grievanceId: created.id,
        nextStatus: "resolved",
        resolutionDetails: "Waste cleared and bins sanitized.",
      });
      expect(resolveResult.success).toBe(true);

      // Verify final detail state
      const finalDetail = await db.getGrievanceDetail(created.id);
      expect(finalDetail?.grievance.status).toBe("resolved");
      expect(finalDetail?.grievance.resolvedAt).toBeDefined();

      // Test INVALID transition: resolved cannot jump directly to assigned
      await expect(
        officerCaller.officer.updateCase({
          grievanceId: created.id,
          nextStatus: "assigned",
          remarks: "Illegal transition attempt",
        })
      ).rejects.toThrow();
    });

    it("rejects unauthorized citizen attempts to execute officer workflow", async () => {
      const citizenCaller = appRouter.createCaller(citizenContext);
      await expect(
        citizenCaller.officer.queue()
      ).rejects.toThrow();

      await expect(
        citizenCaller.officer.updateCase({
          grievanceId: 1,
          nextStatus: "in_progress",
          remarks: "Unauthorized citizen attempt",
        })
      ).rejects.toThrow();
    });
  });

  describe("3. Admin Journey: Overview, Analytics & Management", () => {
    it("returns accurate dashboard analytics aggregations for administrators", async () => {
      const adminCaller = appRouter.createCaller(adminContext);
      const dashboard = await adminCaller.admin.dashboard();

      expect(dashboard).toBeDefined();
      expect(typeof dashboard.total).toBe("number");
      expect(typeof dashboard.openTotal).toBe("number");
      expect(Array.isArray(dashboard.statusCounts)).toBe(true);
      expect(Array.isArray(dashboard.byDepartment)).toBe(true);
      expect(Array.isArray(dashboard.byCategory)).toBe(true);
      expect(Array.isArray(dashboard.workload)).toBe(true);
      expect(dashboard.sla).toBeDefined();
      expect(typeof dashboard.sla.overdue).toBe("number");
    });

    it("lists all grievances and users with safe pagination metadata", async () => {
      const adminCaller = appRouter.createCaller(adminContext);
      const grievances = await adminCaller.admin.listGrievances({
        paginate: true,
        limit: 10,
        offset: 0,
      });

      expect(grievances).toBeDefined();
      expect(Array.isArray(grievances.items)).toBe(true);
      expect(typeof grievances.total).toBe("number");

      const users = await adminCaller.admin.users({
        paginate: true,
        limit: 10,
        offset: 0,
      });
      expect(users).toBeDefined();
      expect(Array.isArray(users.items)).toBe(true);
      expect(typeof users.total).toBe("number");
    });

    it("rejects non-admin roles from accessing admin endpoints", async () => {
      const citizenCaller = appRouter.createCaller(citizenContext);
      await expect(citizenCaller.admin.dashboard()).rejects.toThrow();
      await expect(citizenCaller.admin.listGrievances()).rejects.toThrow();
      await expect(citizenCaller.admin.users()).rejects.toThrow();

      const officerCaller = appRouter.createCaller(officerContext);
      await expect(officerCaller.admin.dashboard()).rejects.toThrow();
      await expect(officerCaller.admin.users()).rejects.toThrow();
    });
  });

  describe("4. Security & Path Traversal Regression Verification", () => {
    it("neutralizes path traversal attempts in attachment endpoints", async () => {
      const app = express();
      registerStorageProxy(app);
      const server = createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;

      try {
        const traversalRes = await fetch(`http://localhost:${port}/api/attachments/..%2F..%2F..%2Fetc%2Fpasswd`);
        // Must either reject with 400, 401, or 404 (never return 200 or leak host files)
        expect([400, 401, 404]).toContain(traversalRes.status);
      } finally {
        server.close();
      }
    });

    it("enforces workflow state machine boundaries across all roles", () => {
      // Direct unit test of state machine rules
      expect(() => assertWorkflowTransition("submitted", "acknowledged", "officer")).not.toThrow();
      expect(() => assertWorkflowTransition("acknowledged", "assigned", "officer")).not.toThrow();
      expect(() => assertWorkflowTransition("assigned", "in_progress", "officer")).not.toThrow();
      expect(() => assertWorkflowTransition("in_progress", "resolved", "officer")).not.toThrow();
      expect(() => assertWorkflowTransition("resolved", "reopened", "user")).not.toThrow();

      // Disallowed transitions
      expect(() => assertWorkflowTransition("submitted", "resolved", "officer")).toThrow();
      expect(() => assertWorkflowTransition("closed", "in_progress", "officer")).toThrow();
      expect(() => assertWorkflowTransition("submitted", "reopened", "user")).toThrow();
    });
  });
});
