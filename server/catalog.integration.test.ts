import { describe, expect, it } from "vitest";
import { ensureInitialCatalog, getActiveCatalog } from "./db";

describe("live service catalog initialization", () => {
  it.skipIf(!process.env.DATABASE_URL)("is idempotent and provides the minimum selectable submission catalog", async () => {
    await ensureInitialCatalog();
    await ensureInitialCatalog();

    const catalog = await getActiveCatalog();
    expect(catalog.departments.map(department => department.name)).toEqual(expect.arrayContaining(["Public Works", "Water and Sanitation", "Community Services"]));
    expect(catalog.categories.length).toBeGreaterThanOrEqual(12);
    expect(new Set(catalog.categories.map(category => `${category.departmentId}:${category.name}`)).size).toBe(catalog.categories.length);
  }, 15000);
});
