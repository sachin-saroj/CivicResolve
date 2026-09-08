import { describe, expect, it } from "vitest";
import { buildBulkPrioritySideEffects, sortAssignedGrievances } from "./db";

const rows = [
  { grievance: { id: 1, priority: "low" as const, status: "resolved" as const, updatedAt: new Date("2026-08-04T10:00:00Z") } },
  { grievance: { id: 2, priority: "critical" as const, status: "assigned" as const, updatedAt: new Date("2026-08-22T10:00:00Z") } },
  { grievance: { id: 3, priority: "high" as const, status: "in_progress" as const, updatedAt: new Date("2026-08-11T10:00:00Z") } },
];

describe("assigned queue sorting", () => {
  it("orders cases by requested priority, update date, and workflow status", () => {
    expect(sortAssignedGrievances([...rows], "priority_desc").map(row => row.grievance.id)).toEqual([2, 3, 1]);
    expect(sortAssignedGrievances([...rows], "updated_asc").map(row => row.grievance.id)).toEqual([1, 3, 2]);
    expect(sortAssignedGrievances([...rows], "status_asc").map(row => row.grievance.id)).toEqual([2, 3, 1]);
  });
});

describe("bulk priority audit payload", () => {
  it("creates an immutable history entry and citizen notification for every selected grievance", () => {
    const effects = buildBulkPrioritySideEffects([
      { id: 8, userId: 51, trackingNumber: "GRV-2026-00008", status: "in_progress" },
      { id: 9, userId: 52, trackingNumber: "GRV-2026-00009", status: "escalated" },
    ], "critical", 21);

    expect(effects.history).toEqual([
      { grievanceId: 8, previousStatus: "in_progress", newStatus: "in_progress", activityType: "priority_change", remarks: "Priority changed to critical through the officer queue.", changedByUserId: 21 },
      { grievanceId: 9, previousStatus: "escalated", newStatus: "escalated", activityType: "priority_change", remarks: "Priority changed to critical through the officer queue.", changedByUserId: 21 },
    ]);
    expect(effects.notifications).toEqual([
      { userId: 51, grievanceId: 8, title: "Grievance priority updated", message: "GRV-2026-00008 has been marked critical priority.", type: "priority_change" },
      { userId: 52, grievanceId: 9, title: "Grievance priority updated", message: "GRV-2026-00009 has been marked critical priority.", type: "priority_change" },
    ]);
  });
});
