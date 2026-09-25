import "dotenv/config";
import { createClient } from "@libsql/client";
import { hashPassword } from "./internalAuth";

async function resetToRealData() {
  console.log("[Reset Real Data] Connecting to local database...");
  const client = createClient({ url: process.env.DATABASE_URL || "file:./local.db" });

  // 1. Wipe all tables cleanly
  console.log("[Reset Real Data] Cleaning test records and restoring baseline...");
  await client.execute("PRAGMA foreign_keys = OFF");
  await client.execute("DELETE FROM notifications");
  await client.execute("DELETE FROM feedback");
  await client.execute("DELETE FROM attachments");
  await client.execute("DELETE FROM grievanceHistory");
  await client.execute("DELETE FROM grievances");
  await client.execute("DELETE FROM officerProfiles");
  await client.execute("DELETE FROM grievanceCategories");
  await client.execute("DELETE FROM users");
  await client.execute("DELETE FROM departments");
  await client.execute("PRAGMA foreign_keys = ON");

  const now = Math.floor(Date.now() / 1000); // timestamp in seconds or Date

  // 2. Insert Real Departments
  console.log("[Reset Real Data] Inserting authentic municipal departments...");
  await client.execute({
    sql: "INSERT INTO departments (id, name, description, slaHours, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())",
    args: [1, "Public Works", "Roads, street lighting, drainage, public pavements & infrastructure maintenance.", 72, "active"],
  });
  await client.execute({
    sql: "INSERT INTO departments (id, name, description, slaHours, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())",
    args: [2, "Water and Sanitation", "Municipal water supply, sewage clearing, garbage collection & sanitation services.", 48, "active"],
  });
  await client.execute({
    sql: "INSERT INTO departments (id, name, description, slaHours, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())",
    args: [3, "Community Services", "Neighbourhood facilities, public safety concerns, campus welfare & noise hazards.", 72, "active"],
  });

  // 3. Insert Real Categories
  console.log("[Reset Real Data] Inserting official service categories...");
  const categories = [
    // Public Works (Dept 1)
    [1, "Street lighting", 1, "Street lighting, pole repair and illuminance issues."],
    [2, "Road maintenance", 1, "Potholes, asphalt resurfacing, curb and pavement repairs."],
    [3, "Drainage and flooding", 1, "Stormwater drains, monsoon flooding and trench clearance."],
    [4, "Public space maintenance", 1, "Public squares, footpaths, divider and public asset upkeep."],
    // Water and Sanitation (Dept 2)
    [5, "Water supply", 2, "Low pressure, water tanker disruption and main supply leaks."],
    [6, "Sewerage", 2, "Blocked sewer lines, manhole overflow and drain clearing."],
    [7, "Waste collection", 2, "Household garbage collection, bin overflow and waste disposal."],
    [8, "Sanitation", 2, "Public toilet hygiene, fumigation and vector control."],
    // Community Services (Dept 3)
    [9, "Community facility", 3, "Community halls, sports grounds and municipal amenity upkeep."],
    [10, "Public safety concern", 3, "Hazardous hanging wires, open trenches and stray animal hazards."],
    [11, "Parks and recreation", 3, "Park lighting, play equipment and green space maintenance."],
    [12, "Other community issue", 3, "Noise pollution, neighbourhood grievances and civic welfare."],
  ];

  for (const [id, name, deptId, desc] of categories) {
    await client.execute({
      sql: "INSERT INTO grievanceCategories (id, name, departmentId, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'active', unixepoch(), unixepoch())",
      args: [id, name, deptId, desc],
    });
  }

  // 4. Insert Real Users: Admin, 3 Department Officers, and Public Service Actor
  console.log("[Reset Real Data] Creating administrative and departmental accounts...");
  const adminHash = hashPassword("Admin@CivicResolve2026!");
  const officerHash = hashPassword("Officer@CivicResolve2026!");

  // Admin (ID 1)
  await client.execute({
    sql: "INSERT INTO users (id, openId, name, email, role, loginMethod, passwordHash, active, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, ?, 1, unixepoch(), unixepoch(), unixepoch())",
    args: [1, "admin-system-master", "System Administrator", "admin@civicresolve.internal", "admin", "internal", adminHash],
  });

  // Public Works Officer: Marcus Vance (ID 2)
  await client.execute({
    sql: "INSERT INTO users (id, openId, name, email, role, departmentId, loginMethod, passwordHash, active, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, unixepoch(), unixepoch(), unixepoch())",
    args: [2, "officer-works-vance", "Marcus Vance", "officer.works@civicresolve.internal", "officer", 1, "internal", officerHash],
  });
  await client.execute({
    sql: "INSERT INTO officerProfiles (userId, departmentId, designation, availability, createdAt, updatedAt) VALUES (?, ?, ?, 'available', unixepoch(), unixepoch())",
    args: [2, 1, "Senior Public Works Inspector"],
  });

  // Water Officer: Elena Rostova (ID 3)
  await client.execute({
    sql: "INSERT INTO users (id, openId, name, email, role, departmentId, loginMethod, passwordHash, active, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, unixepoch(), unixepoch(), unixepoch())",
    args: [3, "officer-water-rostova", "Elena Rostova", "officer.water@civicresolve.internal", "officer", 2, "internal", officerHash],
  });
  await client.execute({
    sql: "INSERT INTO officerProfiles (userId, departmentId, designation, availability, createdAt, updatedAt) VALUES (?, ?, ?, 'available', unixepoch(), unixepoch())",
    args: [3, 2, "Sanitation Operations Lead"],
  });

  // Community Officer: David Kalu (ID 4)
  await client.execute({
    sql: "INSERT INTO users (id, openId, name, email, role, departmentId, loginMethod, passwordHash, active, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, unixepoch(), unixepoch(), unixepoch())",
    args: [4, "officer-community-kalu", "David Kalu", "officer.community@civicresolve.internal", "officer", 3, "internal", officerHash],
  });
  await client.execute({
    sql: "INSERT INTO officerProfiles (userId, departmentId, designation, availability, createdAt, updatedAt) VALUES (?, ?, ?, 'available', unixepoch(), unixepoch())",
    args: [4, 3, "Community Affairs Coordinator"],
  });

  // Public Service Actor for anonymous citizen submissions (ID 5)
  await client.execute({
    sql: "INSERT INTO users (id, openId, name, email, role, loginMethod, active, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, 1, unixepoch(), unixepoch(), unixepoch())",
    args: [5, "civicresolve-public-service", "Civic Public Intake", "intake@civicresolve.internal", "user", "public"],
  });

  // 5. Seed 3 Authentic Demo Complaints
  console.log("[Reset Real Data] Seeding authentic demonstration grievances...");
  
  // Grievance 1: Public Works
  await client.execute({
    sql: `INSERT INTO grievances (
      id, trackingNumber, userId, contactEmail, categoryId, departmentId, assignedOfficerId,
      title, description, location, priority, status, createdAt, updatedAt, dueAt
    ) VALUES (
      1, 'GRV-2026-00041', 5, 'citizen.arjun@example.com', 1, 1, 2,
      'Streetlight outage near 5th Main intersection',
      'The municipal sodium vapor street lamp has been non-functional for two nights, causing hazardous pedestrian conditions outside the local clinic.',
      '5th Main Rd, 7th Cross, Indiranagar', 'medium', 'in_progress',
      unixepoch('now', '-2 days'), unixepoch('now', '-1 day'), unixepoch('now', '+1 day')
    )`,
  });
  await client.execute({
    sql: "INSERT INTO grievanceHistory (grievanceId, previousStatus, newStatus, activityType, remarks, actionTaken, changedByUserId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch('now', '-2 days'))",
    args: [1, "submitted", "acknowledged", "status_change", "Received and catalogued by Public Works Central Triage.", "Verified location validity.", 1],
  });
  await client.execute({
    sql: "INSERT INTO grievanceHistory (grievanceId, previousStatus, newStatus, activityType, remarks, actionTaken, changedByUserId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch('now', '-1 day'))",
    args: [1, "acknowledged", "in_progress", "status_change", "Assigned to Senior Inspector Marcus Vance. Electrical crew scheduled for evening repair.", "Dispatched field unit.", 2],
  });

  // Grievance 2: Water and Sanitation
  await client.execute({
    sql: `INSERT INTO grievances (
      id, trackingNumber, userId, contactEmail, categoryId, departmentId, assignedOfficerId,
      title, description, location, priority, status, createdAt, updatedAt, dueAt
    ) VALUES (
      2, 'GRV-2026-00063', 5, 'rohit.d@example.com', 6, 2, 3,
      'Sewage overflow on pedestrian walkway',
      'Main drainage outlet backing up after heavy rainfall. Sewage water pooling across the public pavement outside residential block B.',
      'Koramangala 5th Block, 12th Main', 'high', 'in_progress',
      unixepoch('now', '-1 day'), unixepoch('now', '-6 hours'), unixepoch('now', '+1 day')
    )`,
  });
  await client.execute({
    sql: "INSERT INTO grievanceHistory (grievanceId, previousStatus, newStatus, activityType, remarks, actionTaken, changedByUserId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch('now', '-1 day'))",
    args: [2, "submitted", "assigned", "status_change", "Urgent sanitary ticket allocated to Elena Rostova.", "Assigned emergency crew.", 1],
  });

  // Grievance 3: Community Services (Resolved with Citizen Feedback)
  await client.execute({
    sql: `INSERT INTO grievances (
      id, trackingNumber, userId, contactEmail, categoryId, departmentId, assignedOfficerId,
      title, description, location, priority, status, resolutionDetails, createdAt, updatedAt, resolvedAt, dueAt
    ) VALUES (
      3, 'GRV-2026-00088', 5, 'ananya.b@example.com', 11, 3, 4,
      'Damaged children play equipment in municipal park',
      'Broken iron chain on the children swing set and exposed metal edges posing risk to park visitors.',
      'Whitefield Community Park, Sector 2', 'medium', 'resolved',
      'Welded and secured replacement chains, installed rubber buffers, and completed child-safety inspection.',
      unixepoch('now', '-4 days'), unixepoch('now', '-1 day'), unixepoch('now', '-1 day'), unixepoch('now', '-2 days')
    )`,
  });
  await client.execute({
    sql: "INSERT INTO grievanceHistory (grievanceId, previousStatus, newStatus, activityType, remarks, actionTaken, changedByUserId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch('now', '-4 days'))",
    args: [3, "submitted", "assigned", "status_change", "Assigned to David Kalu.", "Inspection scheduled.", 1],
  });
  await client.execute({
    sql: "INSERT INTO grievanceHistory (grievanceId, previousStatus, newStatus, activityType, remarks, actionTaken, changedByUserId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch('now', '-1 day'))",
    args: [3, "in_progress", "resolved", "status_change", "Completed equipment overhaul and safety check.", "Replaced damaged chains and painted swings.", 4],
  });
  await client.execute({
    sql: "INSERT INTO feedback (grievanceId, userId, rating, comment, createdAt) VALUES (?, ?, ?, ?, unixepoch('now', '-1 day'))",
    args: [3, 5, 5, "Very impressed by the prompt repair. The park swings are completely safe for kids now. Thank you!"],
  });

  console.log("\n=======================================================");
  console.log("[Reset Real Data] Database cleanly initialized with REAL data only!");
  console.log("=======================================================\n");

  const depts = await client.execute("SELECT id, name, slaHours FROM departments");
  console.log("Departments in database:");
  console.table(depts.rows);

  const grvs = await client.execute("SELECT id, trackingNumber, title, status FROM grievances");
  console.log("Grievances in database:");
  console.table(grvs.rows);
}

resetToRealData().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
