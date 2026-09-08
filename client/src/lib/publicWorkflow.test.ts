import { describe, expect, it } from "vitest";
import { getAttachmentRecoveryMessage, hasInvalidDateRange } from "./publicWorkflow";

describe("public workflow feedback rules", () => {
  it("blocks an invalid queue date range before querying", () => {
    expect(hasInvalidDateRange("2026-09-02", "2026-09-01")).toBe(true);
    expect(hasInvalidDateRange("2026-09-01", "2026-09-01")).toBe(false);
    expect(hasInvalidDateRange("", "2026-09-01")).toBe(false);
  });

  it("keeps a saved grievance recoverable when its attachment fails", () => {
    expect(getAttachmentRecoveryMessage(new Error("Storage temporarily unavailable."))).toBe("Storage temporarily unavailable.");
    expect(getAttachmentRecoveryMessage(null)).toBe("Your grievance was saved, but the supporting document could not be uploaded.");
  });
});
