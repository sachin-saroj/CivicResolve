import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createStaffMutationPlan } from "../client/src/lib/detailWorkflow";

const mocks = vi.hoisted(() => ({
  listAssignedGrievances: vi.fn(),
  suggestInternalGrievances: vi.fn(),
  getGrievanceDetail: vi.fn(),
  getGrievanceDetailByTracking: vi.fn(),
  updateGrievancePriorityBatch: vi.fn(),
  updateGrievanceWorkflow: vi.fn(),
  escalateOverdueGrievances: vi.fn(),
}));

vi.mock("./db", () => mocks);

const { appRouter } = await import("./routers");

function createOfficerContext(): TrpcContext {
  return {
    user: {
      id: 21,
      openId: "officer-queue-test-user",
      name: "Queue Officer",
      email: "officer@example.org",
      loginMethod: "manus",
      role: "officer",
      departmentId: 3,
      active: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

function queueRecord(id: number, status: "assigned" | "in_progress" | "escalated" = "in_progress") {
  return {
    grievance: {
      id,
      userId: 44,
      assignedOfficerId: 21,
      trackingNumber: `GRV-2026-0000${id}`,
      title: `Streetlight case ${id}`,
      location: "Maple Square",
      priority: "medium" as const,
      status,
      updatedAt: new Date("2026-08-20T08:30:00.000Z"),
    },
    department: { id: 3, name: "Public Works" },
    category: { id: 6, name: "Street lighting" },
  };
}

describe("officer queue filters and sorting contract", () => {
  it("lets administrators run overdue escalation", async () => {
    mocks.escalateOverdueGrievances.mockResolvedValueOnce({ updated: 2, grievanceIds: [17, 18] });
    await expect(appRouter.createCaller({ ...createOfficerContext(), user: { ...createOfficerContext().user, id: 99, role: "admin", departmentId: null } }).admin.escalateOverdue()).resolves.toEqual({ updated: 2, grievanceIds: [17, 18] });
    expect(mocks.escalateOverdueGrievances).toHaveBeenCalledOnce();
  });

  it("forwards overdue filtering through the authenticated queue procedure", async () => {
    mocks.listAssignedGrievances.mockResolvedValueOnce([]);
    await expect(appRouter.createCaller(createOfficerContext()).officer.queue({ overdue: true })).resolves.toEqual([]);
    expect(mocks.listAssignedGrievances).toHaveBeenCalledWith(21, { overdue: true }, "officer", 3);
  });

  it("resolves a protected tracking reference to the underlying grievance ID", async () => {
    const record = queueRecord(17);
    mocks.getGrievanceDetailByTracking.mockResolvedValueOnce(record);
    mocks.getGrievanceDetail.mockResolvedValueOnce(record);
    await expect(appRouter.createCaller(createOfficerContext()).grievances.detailByTracking({ trackingNumber: "GRV-2026-00017" })).resolves.toEqual(record);
    expect(mocks.getGrievanceDetailByTracking).toHaveBeenCalledWith("GRV-2026-00017");
    expect(mocks.getGrievanceDetail).toHaveBeenCalledWith(17);
  });

  it("uses the resolved ID for staff writes and refreshes tracking-detail data", () => {
    const detail = { grievance: { id: 17 } };
    const detailInvalidate = vi.fn();
    const trackingInvalidate = vi.fn();
    const plan = createStaffMutationPlan({ grievances: { detail: { invalidate: detailInvalidate }, detailByTracking: { invalidate: trackingInvalidate } } }, detail, 0, "GRV-2026-00017");
    plan.onSuccess();
    expect(plan.grievanceId).toBe(17);
    expect(detailInvalidate).toHaveBeenCalledWith({ grievanceId: 17 });
    expect(trackingInvalidate).toHaveBeenCalledWith({ trackingNumber: "GRV-2026-00017" });
  });

  it("passes administrator-wide scope to the queue helper", async () => {
    const context = createOfficerContext();
    context.user = { ...context.user, id: 99, role: "admin", departmentId: null };
    mocks.listAssignedGrievances.mockResolvedValueOnce([]);
    await expect(appRouter.createCaller(context).officer.queue(undefined)).resolves.toEqual([]);
    expect(mocks.listAssignedGrievances).toHaveBeenCalledWith(99, undefined, "admin", null);
  });

  it("forwards internal autosuggest through the authenticated scope", async () => {
    const suggestions = [{ trackingNumber: "GRV-2026-00001", title: "Streetlight case", location: "Maple Square", status: "in_progress", departmentName: "Public Works" }];
    mocks.suggestInternalGrievances.mockResolvedValueOnce(suggestions);
    await expect(appRouter.createCaller(createOfficerContext()).officer.suggestions({ search: "street" })).resolves.toEqual(suggestions);
    expect(mocks.suggestInternalGrievances).toHaveBeenCalledWith("street", 21, "officer", 3);
  });

  it("forwards all supported filters and returns the filtered queue result", async () => {
    const expected = [queueRecord(1)];
    mocks.listAssignedGrievances.mockResolvedValueOnce(expected);
    const input = { search: "Maple", status: "in_progress" as const, priority: "medium" as const, categoryId: 6, dateFrom: "2026-08-01", dateTo: "2026-08-31", sort: "priority_desc" as const };

    const result = await appRouter.createCaller(createOfficerContext()).officer.queue(input);

    expect(result).toEqual(expected);
    expect(mocks.listAssignedGrievances).toHaveBeenCalledWith(21, input, "officer", 3);
  });
});

describe("officer queue bulk updates", () => {
  it("uses the assigned-case batch priority helper with a complete audit context", async () => {
    mocks.getGrievanceDetail.mockImplementation((id: number) => Promise.resolve(queueRecord(id)));
    mocks.updateGrievancePriorityBatch.mockResolvedValueOnce(undefined);

    const result = await appRouter.createCaller(createOfficerContext()).officer.bulkUpdate({ grievanceIds: [1, 2], action: "priority", priority: "critical" });

    expect(result).toEqual({ success: true, updated: 2 });
    expect(mocks.updateGrievancePriorityBatch).toHaveBeenCalledWith({ grievanceIds: [1, 2], priority: "critical", changedByUserId: 21 });
    expect(mocks.updateGrievanceWorkflow).not.toHaveBeenCalled();
  });

  it("rejects a mixed-status selection when no shared status transition is valid", async () => {
    mocks.getGrievanceDetail.mockImplementation((id: number) => Promise.resolve(queueRecord(id, id === 1 ? "assigned" : "in_progress")));

    await expect(appRouter.createCaller(createOfficerContext()).officer.bulkUpdate({ grievanceIds: [1, 2], action: "status", nextStatus: "resolved" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateGrievanceWorkflow).not.toHaveBeenCalled();
  });

  it("writes each valid case transition with the bulk-update audit note", async () => {
    mocks.getGrievanceDetail.mockImplementation((id: number) => Promise.resolve(queueRecord(id, "in_progress")));
    mocks.updateGrievanceWorkflow.mockResolvedValue(undefined);

    const result = await appRouter.createCaller(createOfficerContext()).officer.bulkUpdate({ grievanceIds: [1, 2], action: "status", nextStatus: "escalated" });

    expect(result).toEqual({ success: true, updated: 2 });
    expect(mocks.updateGrievanceWorkflow).toHaveBeenCalledTimes(2);
    expect(mocks.updateGrievanceWorkflow).toHaveBeenNthCalledWith(1, { grievanceId: 1, nextStatus: "escalated", remarks: "Bulk status update from the officer queue.", changedByUserId: 21 });
    expect(mocks.updateGrievanceWorkflow).toHaveBeenNthCalledWith(2, { grievanceId: 2, nextStatus: "escalated", remarks: "Bulk status update from the officer queue.", changedByUserId: 21 });
  });
});
