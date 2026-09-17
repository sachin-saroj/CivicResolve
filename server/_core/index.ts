import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { escalateOverdueGrievances, getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // 1. Security Headers (Helmet with customized CSP for fonts and Vite HMR)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Standard REST Health Check endpoint for probes and orchestration
  app.get(["/health", "/api/health"], async (_req, res) => {
    try {
      const db = await getDb();
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: db ? "connected" : "disconnected",
      });
    } catch {
      res.status(503).json({ status: "error", database: "disconnected" });
    }
  });

  // 3. Server-side rate limiting on public and sensitive API routes
  const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests from this IP. Please try again after 15 minutes." },
  });
  app.use("/api/", generalApiLimiter);

  const sensitiveWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Submission rate limit exceeded. Please wait a moment before trying again." },
  });
  app.use("/api/trpc/portal.create", sensitiveWriteLimiter);
  app.use("/api/trpc/portal.uploadAttachment", sensitiveWriteLimiter);
  app.use("/api/trpc/portal.feedback", sensitiveWriteLimiter);

  // Configure body parser with appropriate limits
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Register storage and authentication proxies
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  const isProductionBundle = fs.existsSync(path.resolve(import.meta.dirname, "public", "index.html"));
  if (process.env.NODE_ENV !== "production" && !isProductionBundle) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const host = process.env.HOST || "0.0.0.0";
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const SLA_CHECK_INTERVAL_MS = 15 * 60 * 1000;
  const slaInterval = setInterval(() => {
    escalateOverdueGrievances().catch(error => {
      console.error("[SLA Escalation] Background check error:", error);
    });
  }, SLA_CHECK_INTERVAL_MS);

  server.listen(port, host, () => {
    console.log(`Server running on http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`);
  });

  const gracefulShutdown = () => {
    console.log("[Server] Received termination signal, closing server...");
    clearInterval(slaInterval);
    server.close(() => {
      console.log("[Server] HTTP server closed gracefully.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

startServer().catch(console.error);
