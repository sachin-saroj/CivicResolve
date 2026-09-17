import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { isForeignKeysEnabled } from "./db";
import { appRouter } from "./routers";
import { LocalStorageProvider } from "./storageProvider";

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
};

const citizenContext: TrpcContext = {
  user: {
    id: 101,
    openId: "citizen-101",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    role: "user",
    loginMethod: "public",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: null,
    departmentId: null,
    active: 1,
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
};

const officerContext: TrpcContext = {
  user: {
    id: 202,
    openId: "officer-202",
    name: "Officer Verma",
    email: "verma@civic.gov",
    role: "officer",
    loginMethod: "internal",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: "hash",
    departmentId: 1,
    active: 1,
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
};

const adminContext: TrpcContext = {
  user: {
    id: 303,
    openId: "admin-303",
    name: "Commissioner Roy",
    email: "roy@civic.gov",
    role: "admin",
    loginMethod: "internal",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: "hash",
    departmentId: null,
    active: 1,
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
};

describe("Phase 29 — Critical Security & Storage Hardening", () => {
  describe("Milestone 29.1 — Public Data Exposure Remediation", () => {
    it("masks complainant email and sanitizes history in portal.detail", async () => {
      const caller = appRouter.createCaller(anonymousContext);
      // Submit a real case through public portal
      const created = await caller.portal.create({
        title: "Pothole repair required near library",
        departmentId: 1,
        categoryId: 1,
        description: "Large pothole in front of library entrance causing traffic hazard.",
        location: "Central Campus Road",
        contactEmail: "citizen.secret@university.edu",
      });

      expect(created.trackingNumber).toMatch(/^GRV-\d{4}-\d{5}$/);

      // Query public detail
      const detail = await caller.portal.detail({ trackingNumber: created.trackingNumber });

      // 1. Email must be masked, not raw
      expect(detail.grievance.contactEmail).toBe("c***@university.edu");
      expect(detail.grievance.contactEmail).not.toBe("citizen.secret@university.edu");

      // 2. Sensitive internal fields must NOT be leaked
      expect((detail as any).grievance.userId).toBeUndefined();
      expect((detail as any).grievance.assignedOfficerId).toBeUndefined();
      expect((detail as any).citizen).toBeUndefined();
      expect((detail as any).officer).toBeUndefined();

      // 3. History records should be present without internal user IDs
      expect(detail.history.length).toBeGreaterThan(0);
      expect((detail.history[0] as any).history.changedByUserId).toBeUndefined();
    });

    it("sanitizes public.board to omit contactEmail and residential locations", async () => {
      const caller = appRouter.createCaller(anonymousContext);
      const board = await caller.public.board({ limit: 5 });

      expect(Array.isArray(board)).toBe(true);
      if (board.length > 0) {
        const item = board[0];
        expect(item.grievance.contactEmail).toBeNull();
        expect(item.grievance.location).toBeNull();
        expect((item.grievance as any).userId).toBeUndefined();
        expect((item.grievance as any).assignedOfficerId).toBeUndefined();
      }
    });

    it("sanitizes public.suggestions to omit location data", async () => {
      const caller = appRouter.createCaller(anonymousContext);
      const suggestions = await caller.public.suggestions({ search: "pothole" });

      expect(Array.isArray(suggestions)).toBe(true);
      for (const s of suggestions) {
        expect(s.location).toBeNull();
        expect((s as any).contactEmail).toBeUndefined();
      }
    });
  });

  describe("Milestone 29.2 — File Security & Attachment Authorization", () => {
    it("rejects attachment uploads with spoofed magic bytes or invalid extensions", async () => {
      const caller = appRouter.createCaller(anonymousContext);
      const created = await caller.portal.create({
        title: "Broken streetlight pole inspection",
        departmentId: 1,
        categoryId: 1,
        description: "Broken streetlight on avenue three near block b.",
      });

      // 1. Invalid extension disguised as PDF
      await expect(
        caller.portal.uploadAttachment({
          trackingNumber: created.trackingNumber,
          fileName: "malicious_script.exe",
          mimeType: "application/pdf",
          fileData: Buffer.from("%PDF-1.4 test").toString("base64"),
        })
      ).rejects.toThrow();

      // 2. Spoofed PDF with executable/plain content
      await expect(
        caller.portal.uploadAttachment({
          trackingNumber: created.trackingNumber,
          fileName: "evidence.pdf",
          mimeType: "application/pdf",
          fileData: Buffer.from("NOT_A_REAL_PDF_HEADER").toString("base64"),
        })
      ).rejects.toThrow();

      // 3. Valid PDF with correct magic bytes succeeds
      const validPdf = Buffer.from("%PDF-1.4 authentic pdf content");
      const uploadRes = await caller.portal.uploadAttachment({
        trackingNumber: created.trackingNumber,
        fileName: "evidence.pdf",
        mimeType: "application/pdf",
        fileData: validPdf.toString("base64"),
      });

      expect(uploadRes.success).toBe(true);
      expect(uploadRes.url).toContain("/api/attachments/");
    });

    it("prevents path traversal in LocalStorageProvider", async () => {
      const provider = new LocalStorageProvider("./uploads");
      await expect(
        provider.get("../../../etc/passwd")
      ).rejects.toThrow("Path traversal detected");
    });
  });

  describe("Milestone 29.3 — Database Integrity & Pragmas", () => {
    it("verifies SQLite foreign keys pragma is active at runtime", async () => {
      const isEnabled = await isForeignKeysEnabled();
      expect(isEnabled).toBe(true);
    });

    it("ensures sequential tracking numbers increment correctly and uniquely", async () => {
      const caller = appRouter.createCaller(anonymousContext);
      const [case1, case2] = await Promise.all([
        caller.portal.create({
          title: "Concurrent issue report A",
          departmentId: 1,
          categoryId: 1,
          description: "Reporting issue A under concurrent load testing.",
        }),
        caller.portal.create({
          title: "Concurrent issue report B",
          departmentId: 1,
          categoryId: 1,
          description: "Reporting issue B under concurrent load testing.",
        }),
      ]);

      expect(case1.trackingNumber).not.toEqual(case2.trackingNumber);
      expect(case1.id).not.toEqual(case2.id);
    });
  });

  describe("Milestone 29.7 — Authorization Boundary Regression Tests", () => {
    it("prohibits citizens from performing officer or administrator actions", async () => {
      const citizenCaller = appRouter.createCaller(citizenContext);

      // Cannot access officer suggestions
      await expect(
        citizenCaller.officer.suggestions({ search: "case" })
      ).rejects.toThrow(/permission|unauthorized|forbidden/i);

      // Cannot access admin user management
      await expect(
        citizenCaller.admin.users()
      ).rejects.toThrow(/permission|unauthorized|forbidden/i);
    });

    it("prohibits officers from performing admin actions", async () => {
      const officerCaller = appRouter.createCaller(officerContext);

      await expect(
        officerCaller.admin.createDepartment({
          name: "Unauthorized Department",
          slaHours: 48,
        })
      ).rejects.toThrow(/permission|unauthorized|forbidden/i);
    });

    it("allows administrators to access executive management", async () => {
      const adminCaller = appRouter.createCaller(adminContext);
      const users = await adminCaller.admin.users();
      expect(Array.isArray(users)).toBe(true);
    });
  });
});
