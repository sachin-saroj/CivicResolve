import { describe, expect, it } from "vitest";
import { validateJwtSecret, INSECURE_JWT_SECRETS } from "./_core/env";
import {
  validateSeedCredentials,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_OFFICER_PASSWORD,
} from "./seed-admin";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import fs from "node:fs";
import path from "node:path";

function createMockContext(user: any = null): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      cookies: {},
    } as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

describe("PHASE 1: P0 Security Hardening Regressions", () => {
  describe("1. JWT Secret Validation Boundary (server/_core/env.ts)", () => {
    it("fails in production when JWT_SECRET is undefined or empty", () => {
      expect(() => validateJwtSecret(undefined, true)).toThrowError(
        /JWT_SECRET must be set in production/i
      );
      expect(() => validateJwtSecret("", true)).toThrowError(
        /JWT_SECRET must be set in production/i
      );
      expect(() => validateJwtSecret("   ", true)).toThrowError(
        /JWT_SECRET must be set in production/i
      );
    });

    it("fails in production when JWT_SECRET is less than 32 characters", () => {
      expect(() => validateJwtSecret("short-secret-key-too-short", true)).toThrowError(
        /JWT_SECRET must be at least 32 characters in production/i
      );
    });

    it("fails in production when JWT_SECRET is a known default or placeholder", () => {
      for (const insecureSecret of INSECURE_JWT_SECRETS) {
        expect(() => validateJwtSecret(insecureSecret, true)).toThrowError(
          /JWT_SECRET cannot be a known default or placeholder in production/i
        );
      }
    });

    it("accepts a strong, unique 32+ character JWT_SECRET in production", () => {
      const strongSecret = "c98f82a1708d4b31a89c3e981df986280fa7c91d8487b9231f4094be4123512b";
      expect(validateJwtSecret(strongSecret, true)).toBe(strongSecret);
    });

    it("allows fallback to default development secret when not in production", () => {
      expect(validateJwtSecret(undefined, false)).toBe(INSECURE_JWT_SECRETS[0]);
      expect(validateJwtSecret("custom-dev-secret", false)).toBe("custom-dev-secret");
    });
  });

  describe("2. Seed Credentials Validation Boundary (server/seed-admin.ts)", () => {
    it("fails in production when ADMIN_EMAIL is missing", () => {
      expect(() =>
        validateSeedCredentials({
          adminEmail: "",
          adminPassword: "ValidSecurePassword123!",
          isProduction: true,
        })
      ).toThrowError(/ADMIN_EMAIL must be explicitly provided in production/i);
    });

    it("fails in production when ADMIN_PASSWORD is missing or empty", () => {
      expect(() =>
        validateSeedCredentials({
          adminEmail: "admin@example.gov",
          adminPassword: "",
          isProduction: true,
        })
      ).toThrowError(/ADMIN_PASSWORD must be explicitly set/i);
    });

    it("fails in production when ADMIN_PASSWORD is shorter than 12 characters", () => {
      expect(() =>
        validateSeedCredentials({
          adminEmail: "admin@example.gov",
          adminPassword: "Short123!",
          isProduction: true,
        })
      ).toThrowError(/ADMIN_PASSWORD must be at least 12 characters in production/i);
    });

    it("fails in production when ADMIN_PASSWORD uses the known development default", () => {
      expect(() =>
        validateSeedCredentials({
          adminEmail: "admin@example.gov",
          adminPassword: DEFAULT_ADMIN_PASSWORD,
          isProduction: true,
        })
      ).toThrowError(/ADMIN_PASSWORD cannot use the known development default in production/i);
    });

    it("accepts an explicit, strong admin password in production", () => {
      const result = validateSeedCredentials({
        adminEmail: "security-lead@municipality.gov",
        adminPassword: "SuperSecureProductionAdminPass2026!",
        isProduction: true,
      });

      expect(result.adminEmail).toBe("security-lead@municipality.gov");
      expect(result.adminPassword).toBe("SuperSecureProductionAdminPass2026!");
    });

    it("falls back to development defaults when not in production", () => {
      const devResult = validateSeedCredentials({
        isProduction: false,
      });

      expect(devResult.adminEmail).toBe(DEFAULT_ADMIN_EMAIL);
      expect(devResult.adminPassword).toBe(DEFAULT_ADMIN_PASSWORD);
    });
  });

  describe("3. Backend adminProcedure Authorization Boundary (server/routers.ts)", () => {
    it("rejects unauthenticated (anonymous) caller with UNAUTHORIZED (401)", async () => {
      const anonCaller = appRouter.createCaller(createMockContext(null));

      await expect(anonCaller.admin.dashboard()).rejects.toThrowError(
        /Please login/i
      );

      await expect(anonCaller.admin.departments()).rejects.toThrowError(
        /Please login/i
      );

      await expect(anonCaller.admin.categories()).rejects.toThrowError(
        /Please login/i
      );
    });

    it("rejects non-admin roles (citizen user) with FORBIDDEN (403)", async () => {
      const citizenUser = {
        id: 101,
        openId: "citizen-1",
        email: "citizen@example.org",
        name: "Citizen Jane",
        role: "user" as const,
        loginMethod: "manus",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };

      const citizenCaller = appRouter.createCaller(createMockContext(citizenUser));

      await expect(citizenCaller.admin.dashboard()).rejects.toThrowError(
        /You do not have permission to access this workspace/i
      );
    });

    it("rejects departmental officers from admin procedures with FORBIDDEN (403)", async () => {
      const officerUser = {
        id: 202,
        openId: "officer-2",
        email: "officer@civicresolve.internal",
        name: "Field Officer",
        role: "officer" as const,
        departmentId: 1,
        loginMethod: "internal",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };

      const officerCaller = appRouter.createCaller(createMockContext(officerUser));

      await expect(officerCaller.admin.dashboard()).rejects.toThrowError(
        /You do not have permission to access this workspace/i
      );

      await expect(
        officerCaller.admin.createDepartment({ name: "Health", slaHours: 48 })
      ).rejects.toThrowError(/You do not have permission to access this workspace/i);
    });
  });

  describe("4. Demo Credentials Source Isolation Boundary", () => {
    it("verifies client/src/pages/InternalLogin.tsx gates demo credentials behind import.meta.env.DEV", () => {
      const loginFilePath = path.resolve(process.cwd(), "client/src/pages/InternalLogin.tsx");
      const fileContent = fs.readFileSync(loginFilePath, "utf-8");

      expect(fileContent).toContain("import.meta.env.DEV ? (");
      expect(fileContent).toContain("Demo Testing Accounts (Click to Fill)");
      expect(fileContent).toContain("admin@civicresolve.internal");

      // Verify that the demo credential section is strictly within the import.meta.env.DEV conditional
      const devIndex = fileContent.indexOf("import.meta.env.DEV ? (");
      const demoFillIndex = fileContent.indexOf("fillCredentials(\"admin@civicresolve.internal\"");
      expect(devIndex).toBeGreaterThan(-1);
      expect(demoFillIndex).toBeGreaterThan(devIndex);
    });

    it("verifies server/internalAuth.ts derives secret directly from ENV without local fallback constant", () => {
      const authFilePath = path.resolve(process.cwd(), "server/internalAuth.ts");
      const fileContent = fs.readFileSync(authFilePath, "utf-8");

      expect(fileContent).not.toContain("DEFAULT_DEV_SECRET");
      expect(fileContent).toContain("return new TextEncoder().encode(ENV.cookieSecret);");
    });
  });
});
