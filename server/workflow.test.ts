import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { assertWorkflowTransition, statusLabel } from "./workflow";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "officer" | "admin"): TrpcContext {
  return {
    user: {
      id: 21,
      openId: "workflow-test-user",
      name: "Workflow Tester",
      email: "workflow@example.org",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("grievance workflow", () => {
  it("permits the controlled active-service path", () => {
    expect(() => assertWorkflowTransition("submitted", "acknowledged", "admin")).not.toThrow();
    expect(() => assertWorkflowTransition("acknowledged", "assigned", "admin")).not.toThrow();
    expect(() => assertWorkflowTransition("assigned", "in_progress", "officer")).not.toThrow();
    expect(() => assertWorkflowTransition("in_progress", "resolved", "officer")).not.toThrow();
    expect(statusLabel("in_progress")).toBe("In Progress");
  });

  it("rejects invalid transitions and citizen status changes outside reopening", () => {
    expect(() => assertWorkflowTransition("submitted", "closed", "admin")).toThrow(/cannot move/i);
    expect(() => assertWorkflowTransition("in_progress", "resolved", "user")).toThrow(/only reopen/i);
    expect(() => assertWorkflowTransition("resolved", "reopened", "user")).not.toThrow();
  });
});

describe("role authorization", () => {
  it("allows citizens to load their own workspace data", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    const dashboard = await caller.citizen.dashboard();
    expect(dashboard).toMatchObject({ total: expect.any(Number) });
    await expect(caller.citizen.list()).resolves.toEqual(expect.any(Array));
  });

  it("allows officers to load their assigned queue", async () => {
    const caller = appRouter.createCaller(createContext("officer"));
    await expect(caller.officer.queue({ search: "GRV", sort: "priority_desc", dateFrom: "2026-01-01", dateTo: "2026-12-31" })).resolves.toEqual(expect.any(Array));
  });

  it("blocks a citizen from the officer queue before any database work", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.officer.queue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks a citizen from officer bulk actions before any database work", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.officer.bulkUpdate({ grievanceIds: [1, 2], action: "priority", priority: "high" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks an officer from administrator metrics before any database work", async () => {
    const caller = appRouter.createCaller(createContext("officer"));
    await expect(caller.admin.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
