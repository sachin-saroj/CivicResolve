import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mocks = vi.hoisted(() => ({
  getPublicServiceActor: vi.fn(),
  createGrievanceRecord: vi.fn(),
  getGrievanceDetail: vi.fn(),
  getGrievanceDetailByTracking: vi.fn(),
  updateGrievancePriorityBatch: vi.fn(),
  submitPublicFeedback: vi.fn(),
  getAdminDashboardData: vi.fn(),
  escalateOverdueGrievances: vi.fn().mockResolvedValue({ updated: 0, grievanceIds: [] }),
}));

vi.mock("./db", () => mocks);

const { appRouter } = await import("./routers");

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
};

describe("login-free public portal", () => {
  it("opens a full case record through its tracking reference without a session", async () => {
    const record = { grievance: { id: 8, trackingNumber: "GRV-2026-00008" } };
    mocks.getGrievanceDetailByTracking.mockResolvedValueOnce(record);

    await expect(appRouter.createCaller(anonymousContext).portal.detail({ trackingNumber: "grv-2026-00008" })).resolves.toEqual(record);
    expect(mocks.getGrievanceDetailByTracking).toHaveBeenCalledWith("grv-2026-00008");
  });

  it("submits a grievance without an account and attributes it to the public portal service actor", async () => {
    mocks.getPublicServiceActor.mockResolvedValueOnce(77);
    mocks.createGrievanceRecord.mockResolvedValueOnce({ id: 12, trackingNumber: "GRV-2026-00012" });
    const input = { title: "Streetlight outage near the crossing", departmentId: 2, categoryId: 4, description: "The streetlight has been out for several evenings and the crossing is poorly lit.", location: "Maple Square", contactEmail: "citizen@example.org" };

    await expect(appRouter.createCaller(anonymousContext).portal.create(input)).resolves.toEqual({ id: 12, trackingNumber: "GRV-2026-00012" });
    expect(mocks.createGrievanceRecord).toHaveBeenCalledWith({ ...input, userId: 77 });
  });

  it("submits one-time public feedback by tracking reference", async () => {
    mocks.submitPublicFeedback.mockResolvedValueOnce({ success: true });
    const input = { trackingNumber: "GRV-2026-00008", rating: 4, comment: "The update was useful." };
    await expect(appRouter.createCaller(anonymousContext).portal.feedback(input)).resolves.toEqual({ success: true });
    expect(mocks.submitPublicFeedback).toHaveBeenCalledWith(input);
  });

  it("keeps the public case detail view read-only", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/PublicCaseDetail.tsx"), "utf8");
    expect(source).not.toContain("officer.addProgress");
    expect(source).not.toContain("officer.updateCase");
    expect(source).toContain("Protected service workspace");
  });

  it("returns expanded administrator analytics only to administrators", async () => {
    mocks.getAdminDashboardData.mockResolvedValueOnce({ total: 8, statusCounts: [], byDepartment: [], byCategory: [{ label: "Street lighting", total: 3 }], workload: [], feedback: { responses: 2, averageRating: 4.5 }, sla: { overdue: 1, escalated: 2 }, averageResolutionHours: 18 });
    const adminContext = { ...anonymousContext, user: { id: 99, openId: "admin", name: "Admin", email: "admin@example.org", loginMethod: "internal", role: "admin" as const, departmentId: null, active: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } };
    await expect(appRouter.createCaller(adminContext).admin.dashboard()).resolves.toMatchObject({ feedback: { averageRating: 4.5 }, sla: { overdue: 1 }, averageResolutionHours: 18 });
  });

  it("rejects public bulk case writes without an authenticated staff session", async () => {
    await expect(appRouter.createCaller(anonymousContext).officer.bulkUpdate({ grievanceIds: [4, 5], action: "priority", priority: "high" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
