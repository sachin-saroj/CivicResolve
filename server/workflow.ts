import { TRPCError } from "@trpc/server";
import type { GrievanceStatus } from "../drizzle/schema";

const transitions: Record<GrievanceStatus, GrievanceStatus[]> = {
  submitted: ["acknowledged"],
  acknowledged: ["assigned"],
  assigned: ["in_progress"],
  in_progress: ["resolved", "escalated"],
  escalated: ["in_progress"],
  resolved: ["closed", "reopened"],
  reopened: ["in_progress"],
  closed: [],
};

export function assertWorkflowTransition(
  previousStatus: GrievanceStatus,
  nextStatus: GrievanceStatus,
  role: "user" | "officer" | "admin",
) {
  if (role === "user" && !(previousStatus === "resolved" && nextStatus === "reopened")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Citizens can only reopen a resolved grievance.",
    });
  }

  if (!transitions[previousStatus].includes(nextStatus)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `A grievance cannot move from ${previousStatus.replace("_", " ")} to ${nextStatus.replace("_", " ")}.`,
    });
  }
}

export function statusLabel(status: GrievanceStatus) {
  return status.replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
