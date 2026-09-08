import { describe, expect, it } from "vitest";
import { isStaffCaseVisible, listAssignedGrievances, shapeInternalSuggestionRows } from "./db";
import type { GrievanceStatus, GrievancePriority } from "../drizzle/schema";

describe("internal staff data scope", () => {
  const officer = { userId: 21, departmentId: 3 };

  it("allows assigned or departmental cases and excludes unrelated cases", () => {
    expect(isStaffCaseVisible({ assignedOfficerId: 21, departmentId: 99 }, officer.userId, "officer", officer.departmentId)).toBe(true);
    expect(isStaffCaseVisible({ assignedOfficerId: null, departmentId: 3 }, officer.userId, "officer", officer.departmentId)).toBe(true);
    expect(isStaffCaseVisible({ assignedOfficerId: 22, departmentId: 99 }, officer.userId, "officer", officer.departmentId)).toBe(false);
  });

  it("allows administrators to see every department", () => {
    expect(isStaffCaseVisible({ assignedOfficerId: 22, departmentId: 99 }, 99, "admin", null)).toBe(true);
  });

  it("filters the actual queue result for officers and leaves admin results unrestricted", async () => {
    const rows = [
      { grievance: { id: 1, assignedOfficerId: 21, departmentId: 99, priority: "medium" as GrievancePriority, status: "in_progress" as GrievanceStatus, updatedAt: new Date("2026-08-20") }, department: { id: 99, name: "Other" }, category: { id: 1, name: "Streetlight" } },
      { grievance: { id: 2, assignedOfficerId: null, departmentId: 3, priority: "medium" as GrievancePriority, status: "assigned" as GrievanceStatus, updatedAt: new Date("2026-08-19") }, department: { id: 3, name: "Public Works" }, category: { id: 2, name: "Roads" } },
      { grievance: { id: 3, assignedOfficerId: 22, departmentId: 99, priority: "low" as GrievancePriority, status: "submitted" as GrievanceStatus, updatedAt: new Date("2026-08-18") }, department: { id: 99, name: "Other" }, category: { id: 3, name: "Water" } },
    ];
    const query = {
      select: () => query,
      from: () => query,
      innerJoin: () => query,
      where: () => query,
      orderBy: () => query,
      limit: () => query,
      offset: () => Promise.resolve(rows),
    } as unknown as NonNullable<Awaited<ReturnType<typeof import("./db").getDb>>>;
    await expect(listAssignedGrievances(21, undefined, "officer", 3, query)).resolves.toHaveLength(2);
    await expect(listAssignedGrievances(21, undefined, "admin", null, query)).resolves.toHaveLength(3);
  });

  it("filters internal suggestions with the same scope and keeps admin suggestions broad", () => {
    const rows = [
      { trackingNumber: "GRV-2026-00001", title: "Assigned streetlight", location: "North", status: "in_progress" as const, departmentName: "Public Works", assignedOfficerId: 21, departmentId: 9 },
      { trackingNumber: "GRV-2026-00002", title: "Department streetlight", location: "South", status: "assigned" as const, departmentName: "Public Works", assignedOfficerId: null, departmentId: 3 },
      { trackingNumber: "GRV-2026-00003", title: "Other streetlight", location: "East", status: "submitted" as const, departmentName: "Water", assignedOfficerId: 22, departmentId: 99 },
    ];
    expect(shapeInternalSuggestionRows(rows, "streetlight", 21, "officer", 3).map(row => row.trackingNumber)).toEqual(["GRV-2026-00001", "GRV-2026-00002"]);
    expect(shapeInternalSuggestionRows(rows, "streetlight", 21, "admin", null).map(row => row.trackingNumber)).toEqual(["GRV-2026-00001", "GRV-2026-00002", "GRV-2026-00003"]);
  });
});
