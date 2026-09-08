import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL || "file:./local.db";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: connectionString,
  },
});
