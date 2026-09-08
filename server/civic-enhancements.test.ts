import { describe, expect, it } from "vitest";
import { buildCsv, buildPdf, type CaseReportRow } from "../client/src/lib/reportExports";
import { nextSuggestionIndex, previousSuggestionIndex, shouldSelectSuggestion } from "../client/src/lib/caseSearch";
import { normalizePublicSuggestion, PUBLIC_SUGGESTION_LIMIT, shapePublicSuggestionRows, type PublicSuggestionRow } from "./db";
import { readThemePreference, resolveTheme, THEME_STORAGE_KEY } from "../client/src/lib/themePreference";

const sampleRow: CaseReportRow = {
  trackingNumber: "GRV-2026-00017",
  title: "Streetlight outage, Maple Square",
  department: "Public Works",
  category: "Street lighting",
  location: "Maple Square",
  priority: "High",
  status: "In Progress",
  updatedAt: "8/27/2026, 9:45:00 AM",
};

describe("case report exports", () => {
  it("escapes commas, quotes, and newlines in CSV values", () => {
    const csv = buildCsv([sampleRow]);
    expect(csv).toContain("trackingNumber,title,department");
    expect(csv).toContain('"Streetlight outage, Maple Square"');
    expect(csv).not.toContain("\n\n");
  });

  it("creates a readable PDF document with a valid header and case row", () => {
    const pdf = buildPdf([sampleRow]);
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("GRV-2026-00017");
    expect(pdf).toContain("%%EOF");
  });
});

describe("public suggestion data contract", () => {
  it("trims and bounds suggestion queries while rejecting too-short input", () => {
    expect(normalizePublicSuggestion("  street  ")).toBe("street");
    expect(normalizePublicSuggestion("x")).toBeNull();
    expect(normalizePublicSuggestion("a".repeat(100))).toHaveLength(80);
    expect(PUBLIC_SUGGESTION_LIMIT).toBe(8);
  });

  it("filters by tracking ID, title, or location and bounds results", () => {
    const rows = Array.from({ length: 10 }, (_, index): PublicSuggestionRow => ({ trackingNumber: `GRV-2026-${String(index).padStart(5, "0")}`, title: index === 9 ? "Unrelated" : `Streetlight ${index}`, location: index === 9 ? "Other place" : "Maple Square", status: "in_progress", departmentName: "Public Works" }));
    const matches = shapePublicSuggestionRows(rows, "street");
    expect(matches).toHaveLength(8);
    expect(matches.every(row => row.title.toLowerCase().includes("street"))).toBe(true);
  });
});

describe("case search keyboard behavior", () => {
  it("wraps through suggestions and selects only an active result", () => {
    expect(nextSuggestionIndex(-1, 3)).toBe(0);
    expect(nextSuggestionIndex(2, 3)).toBe(0);
    expect(previousSuggestionIndex(0, 3)).toBe(2);
    expect(shouldSelectSuggestion("Enter", 1)).toBe(true);
    expect(shouldSelectSuggestion("Enter", -1)).toBe(false);
  });
});

describe("theme preference", () => {
  it("reads explicit preferences and falls back to the system preference", () => {
    const storage = { getItem: (key: string) => key === THEME_STORAGE_KEY ? "dark" : null };
    expect(readThemePreference(storage)).toBe("dark");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });
});
