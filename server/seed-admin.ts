import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { departments, officerProfiles, users } from "../drizzle/schema";
import { hashPassword } from "./internalAuth";

/**
 * Seeded Default Credentials for Local Testing & QA Verification:
 *
 * 1. System Administrator:
 *    Email:    admin@civicresolve.internal
 *    Password: Admin@CivicResolve2026!
 *    Role:     admin
 *
 * 2. Sample Departmental Officers:
 *    - Public Works:
 *      Email:    officer.works@civicresolve.internal
 *      Password: Officer@CivicResolve2026!
 *      Role:     officer
 *      Desig:    Senior Public Works Inspector
 *
 *    - Water and Sanitation:
 *      Email:    officer.water@civicresolve.internal
 *      Password: Officer@CivicResolve2026!
 *      Role:     officer
 *      Desig:    Sanitation Operations Lead
 *
 *    - Community Services:
 *      Email:    officer.community@civicresolve.internal
 *      Password: Officer@CivicResolve2026!
 *      Role:     officer
 *      Desig:    Community Affairs Coordinator
 */

export const DEFAULT_ADMIN_EMAIL = "admin@civicresolve.internal";
export const DEFAULT_ADMIN_PASSWORD = "Admin@CivicResolve2026!";
export const DEFAULT_OFFICER_PASSWORD = "Officer@CivicResolve2026!";

export interface SeedCredentialsConfig {
  adminEmail?: string;
  adminPassword?: string;
  isProduction: boolean;
}

export function validateSeedCredentials(config: SeedCredentialsConfig) {
  const adminEmail = (config.adminEmail || "").trim().toLowerCase();
  const adminPassword = config.adminPassword || "";

  if (config.isProduction) {
    if (!adminEmail) {
      throw new Error("ADMIN_EMAIL must be explicitly provided in production.");
    }
    if (!adminPassword || adminPassword.trim().length === 0) {
      throw new Error("ADMIN_PASSWORD must be explicitly set via environment variable or CLI argument in production.");
    }
    if (adminPassword.length < 12) {
      throw new Error("ADMIN_PASSWORD must be at least 12 characters in production.");
    }
    if (adminPassword === DEFAULT_ADMIN_PASSWORD) {
      throw new Error("ADMIN_PASSWORD cannot use the known development default in production.");
    }
  }

  return {
    adminEmail: adminEmail || DEFAULT_ADMIN_EMAIL,
    adminPassword: adminPassword || DEFAULT_ADMIN_PASSWORD,
  };
}

export const sampleOfficers = [
  {
    name: "Marcus Vance",
    email: "officer.works@civicresolve.internal",
    departmentName: "Public Works",
    designation: "Senior Public Works Inspector",
    password: process.env.OFFICER_WORKS_PASSWORD || DEFAULT_OFFICER_PASSWORD,
  },
  {
    name: "Elena Rostova",
    email: "officer.water@civicresolve.internal",
    departmentName: "Water and Sanitation",
    designation: "Sanitation Operations Lead",
    password: process.env.OFFICER_WATER_PASSWORD || DEFAULT_OFFICER_PASSWORD,
  },
  {
    name: "David Kalu",
    email: "officer.community@civicresolve.internal",
    departmentName: "Community Services",
    designation: "Community Affairs Coordinator",
    password: process.env.OFFICER_COMMUNITY_PASSWORD || DEFAULT_OFFICER_PASSWORD,
  },
];

async function seedAdminAndOfficers() {
  const isProduction = process.env.NODE_ENV === "production";
  const rawAdminEmail = process.argv[2] || process.env.ADMIN_EMAIL;
  const rawAdminPassword = process.argv[3] || process.env.ADMIN_PASSWORD;

  const { adminEmail, adminPassword } = validateSeedCredentials({
    adminEmail: rawAdminEmail,
    adminPassword: rawAdminPassword,
    isProduction,
  });
  const adminName = process.env.ADMIN_NAME || "System Administrator";

  console.log(`\n======================================================`);
  console.log(`[Seed Script] Initializing Admin & Departmental Officers`);
  console.log(`======================================================\n`);

  const db = await getDb();
  if (!db) {
    console.error("[Seed Script] Database connection failed. Ensure DATABASE_URL is set.");
    process.exit(1);
  }

  // 1. Seed / Upsert Administrator Account
  console.log(`[Seed Admin] Preparing administrator account: ${adminEmail}`);
  const existingAdmins = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  const adminHash = hashPassword(adminPassword);
  const now = new Date();

  if (existingAdmins.length > 0) {
    const existing = existingAdmins[0];
    await db
      .update(users)
      .set({
        name: adminName,
        role: "admin",
        active: 1,
        passwordHash: adminHash,
        updatedAt: now,
        lastSignedIn: now,
      })
      .where(eq(users.id, existing.id));

    console.log(`[Seed Admin] Updated existing user (ID: ${existing.id}) to active admin.`);
  } else {
    const openId = `seed-admin-${Date.now()}`;
    await db.insert(users).values({
      openId,
      name: adminName,
      email: adminEmail,
      role: "admin",
      active: 1,
      loginMethod: "internal",
      passwordHash: adminHash,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    });

    console.log(`[Seed Admin] Created new administrator account.`);
  }
  if (isProduction) {
    console.log(`[Seed Admin] Admin Account Ready: ${adminEmail} (password hidden for security)\n`);
  } else {
    console.log(`[Seed Admin] Admin Account Ready: ${adminEmail} | Password: ${adminPassword}\n`);
  }

  // 2. Seed / Upsert Sample Departmental Officers
  console.log(`[Seed Officers] Mapping officers to active departments...`);
  const activeDepartments = await db.select().from(departments);
  const deptMap = new Map(activeDepartments.map(d => [d.name.toLowerCase().trim(), d.id]));

  for (const officer of sampleOfficers) {
    if (isProduction && officer.password === DEFAULT_OFFICER_PASSWORD) {
      console.log(`[Seed Officers] Skipping demo officer "${officer.name}" (${officer.email}) in production (requires explicit secure password).`);
      continue;
    }

    const lookupKey = officer.departmentName.toLowerCase().trim();
    const deptId = deptMap.get(lookupKey);

    if (!deptId) {
      console.warn(`[Seed Officers] WARNING: Department "${officer.departmentName}" not found in database; skipping officer ${officer.email}.`);
      continue;
    }

    const officerEmail = officer.email.toLowerCase().trim();
    const officerHash = hashPassword(officer.password);
    const existingOfficers = await db.select().from(users).where(eq(users.email, officerEmail)).limit(1);

    let officerUserId: number;

    if (existingOfficers.length > 0) {
      officerUserId = existingOfficers[0].id;
      await db
        .update(users)
        .set({
          name: officer.name,
          role: "officer",
          departmentId: deptId,
          active: 1,
          passwordHash: officerHash,
          updatedAt: now,
          lastSignedIn: now,
        })
        .where(eq(users.id, officerUserId));

      console.log(`[Seed Officers] Updated user "${officer.name}" (ID: ${officerUserId}) for department "${officer.departmentName}".`);
    } else {
      const openId = `seed-officer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await db.insert(users).values({
        openId,
        name: officer.name,
        email: officerEmail,
        role: "officer",
        departmentId: deptId,
        active: 1,
        loginMethod: "internal",
        passwordHash: officerHash,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      });

      const inserted = await db.select().from(users).where(eq(users.email, officerEmail)).limit(1);
      officerUserId = inserted[0].id;
      console.log(`[Seed Officers] Created user "${officer.name}" (ID: ${officerUserId}) for department "${officer.departmentName}".`);
    }

    // Upsert into officerProfiles
    const existingProfiles = await db
      .select()
      .from(officerProfiles)
      .where(eq(officerProfiles.userId, officerUserId))
      .limit(1);

    if (existingProfiles.length > 0) {
      await db
        .update(officerProfiles)
        .set({
          departmentId: deptId,
          designation: officer.designation,
          availability: "available",
          updatedAt: now,
        })
        .where(eq(officerProfiles.userId, officerUserId));

      console.log(`[Seed Officers] Updated officer profile for "${officer.name}".`);
    } else {
      await db.insert(officerProfiles).values({
        userId: officerUserId,
        departmentId: deptId,
        designation: officer.designation,
        availability: "available",
        createdAt: now,
        updatedAt: now,
      });

      console.log(`[Seed Officers] Created officer profile for "${officer.name}".`);
    }

    console.log(`  -> Officer Email:    ${officerEmail}`);
    if (isProduction) {
      console.log(`  -> Password:         [REDACTED]`);
    } else {
      console.log(`  -> Password:         ${officer.password}`);
    }
    console.log(`  -> Department:       ${officer.departmentName} (ID: ${deptId})`);
    console.log(`  -> Designation:      ${officer.designation}\n`);
  }

  console.log(`======================================================`);
  console.log(`[Seed Script] All accounts seeded successfully.`);
  console.log(`======================================================\n`);
}

if (process.env.NODE_ENV !== "test") {
  seedAdminAndOfficers()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error("[Seed Script] Error during seed:", error);
      process.exit(1);
    });
}
