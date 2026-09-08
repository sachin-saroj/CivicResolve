import { describe, expect, it } from "vitest";
import { buildSlaEscalationUpdate, isSlaOverdue } from "./db";

describe("SLA escalation policy", () => {
  const now = new Date("2026-08-27T12:00:00.000Z");

  it("flags overdue active cases that have not been escalated", () => {
    expect(isSlaOverdue({ dueAt: new Date("2026-08-27T11:59:00.000Z"), escalatedAt: null, status: "in_progress" }, now)).toBe(true);
    expect(isSlaOverdue({ dueAt: new Date("2026-08-27T12:01:00.000Z"), escalatedAt: null, status: "in_progress" }, now)).toBe(false);
  });

  it("does not re-escalate terminal or already escalated cases", () => {
    expect(isSlaOverdue({ dueAt: new Date("2026-08-26T11:00:00.000Z"), escalatedAt: null, status: "resolved" }, now)).toBe(false);
    expect(isSlaOverdue({ dueAt: new Date("2026-08-26T11:00:00.000Z"), escalatedAt: now, status: "escalated" }, now)).toBe(false);
  });

  it("raises overdue cases to critical escalation with an immutable timestamp", () => {
    expect(buildSlaEscalationUpdate(now)).toEqual({ status: "escalated", priority: "critical", escalatedAt: now });
  });
});
