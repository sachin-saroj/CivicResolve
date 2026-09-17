import type { Express } from "express";
import { sdk } from "./sdk";
import * as db from "../db";
import { getStorageProvider } from "../storageProvider";
import { attachments, grievances } from "../../drizzle/schema";
import { eq, or, like } from "drizzle-orm";

export function registerStorageProxy(app: Express) {
  // Authorized attachment download endpoint
  app.get("/api/attachments/*", async (req, res) => {
    const rawKey = (req.params as Record<string, string>)[0];
    if (!rawKey) {
      res.status(400).json({ error: "Missing attachment key." });
      return;
    }

    // Path traversal defense
    const key = decodeURIComponent(rawKey).replace(/^\/+/, "").replace(/\.\./g, "");

    try {
      // 1. Check for authenticated user or valid tracking reference
      const user = await sdk.authenticateRequest(req).catch(() => null);
      const queryTrackingNumber = typeof req.query.trackingNumber === "string" ? req.query.trackingNumber.trim().toUpperCase() : null;

      if (!user && !queryTrackingNumber) {
        res.status(401).json({ error: "Authentication or valid tracking number required to access case attachments." });
        return;
      }

      // 2. Locate attachment record
      const database = await db.getDb();
      if (!database) {
        res.status(503).json({ error: "Database unavailable." });
        return;
      }

      const attRows = await database
        .select()
        .from(attachments)
        .where(or(eq(attachments.fileKey, key), like(attachments.fileKey, `%${key}`)))
        .limit(1);

      if (!attRows[0]) {
        res.status(404).json({ error: "Attachment not found." });
        return;
      }

      const attachment = attRows[0];

      // 3. Verify access authorization
      const grvRows = await database
        .select()
        .from(grievances)
        .where(eq(grievances.id, attachment.grievanceId))
        .limit(1);

      if (!grvRows[0]) {
        res.status(404).json({ error: "Associated grievance not found." });
        return;
      }

      const grievance = grvRows[0];

      if (user) {
        const isOwner = grievance.userId === user.id;
        const isAssigned = grievance.assignedOfficerId === user.id;
        const isDeptOfficer =
          user.role === "officer" &&
          user.departmentId != null &&
          grievance.departmentId === user.departmentId;
        const isAdmin = user.role === "admin";

        if (!isOwner && !isAssigned && !isDeptOfficer && !isAdmin) {
          res.status(403).json({ error: "You are not authorized to access this attachment." });
          return;
        }
      } else if (queryTrackingNumber) {
        if (grievance.trackingNumber.toUpperCase() !== queryTrackingNumber) {
          res.status(403).json({ error: "Invalid tracking reference for this attachment." });
          return;
        }
      }

      // 4. Retrieve and stream the file
      const provider = getStorageProvider();
      const file = await provider.get(attachment.fileKey);

      if (!file) {
        res.status(404).json({ error: "Attachment file missing from storage." });
        return;
      }

      const safeDownloadName = attachment.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

      res.set({
        "Content-Type": attachment.mimeType || file.mimeType,
        "Content-Disposition": `attachment; filename="${safeDownloadName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
      });

      res.send(file.data);
    } catch (err) {
      console.error("[StorageProxy] Error serving attachment:", err);
      res.status(500).json({ error: "Failed to retrieve attachment." });
    }
  });

  // Legacy route backwards-compatibility with redirection to secure endpoint
  app.get("/manus-storage/*", async (req, res) => {
    const rawKey = (req.params as Record<string, string>)[0];
    if (!rawKey) {
      res.status(400).send("Missing storage key");
      return;
    }
    const key = decodeURIComponent(rawKey).replace(/^\/+/, "").replace(/\.\./g, "");
    res.redirect(307, `/api/attachments/${encodeURIComponent(key)}`);
  });
}
