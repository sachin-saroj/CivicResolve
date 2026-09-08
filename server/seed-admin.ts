import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { hashPassword } from "./internalAuth";

async function seedAdmin() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || "admin@civicresolve.internal").trim().toLowerCase();
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || "Admin@CivicResolve2026!";
  const name = process.env.ADMIN_NAME || "System Administrator";

  console.log(`[Seed Admin] Preparing administrator account for: ${email}`);

  const db = await getDb();
  if (!db) {
    console.error("[Seed Admin] Database connection failed. Ensure DATABASE_URL is set.");
    process.exit(1);
  }

  const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const passwordHash = hashPassword(password);

  if (existingUsers.length > 0) {
    const existing = existingUsers[0];
    await db
      .update(users)
      .set({
        name,
        role: "admin",
        active: 1,
        passwordHash,
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      })
      .where(eq(users.id, existing.id));

    console.log(`[Seed Admin] Successfully updated existing user (ID: ${existing.id}) to active admin.`);
  } else {
    const openId = `seed-admin-${Date.now()}`;
    await db.insert(users).values({
      openId,
      name,
      email,
      role: "admin",
      active: 1,
      loginMethod: "internal",
      passwordHash,
    });

    console.log(`[Seed Admin] Successfully created new administrator account.`);
  }

  console.log(`[Seed Admin] Credentials configured: Email = ${email}`);
}

seedAdmin()
  .then(() => {
    console.log("[Seed Admin] Done.");
    process.exit(0);
  })
  .catch(error => {
    console.error("[Seed Admin] Error seeding admin:", error);
    process.exit(1);
  });
