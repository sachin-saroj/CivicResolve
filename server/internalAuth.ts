import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../drizzle/schema";
import { ENV } from "./_core/env";

export const INTERNAL_COOKIE_NAME = "civic_internal_session";
const SESSION_TTL = "8h";

type InternalSession = {
  userId: number;
  role: "officer" | "admin";
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, encoded: string | null | undefined) {
  if (!encoded?.startsWith("scrypt:")) return false;
  const [, salt, stored] = encoded.split(":");
  if (!salt || !stored) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(stored, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

const DEFAULT_DEV_SECRET = "civic-resolve-default-dev-secret-key-at-least-32-chars";

function secretKey() {
  const raw = ENV.cookieSecret || DEFAULT_DEV_SECRET;
  return new TextEncoder().encode(raw);
}

export async function createInternalSession(user: Pick<User, "id" | "role">) {
  return new SignJWT({ userId: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());
}

export async function verifyInternalSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const userId = Number(payload.userId);
    const role = payload.role;
    if (!Number.isInteger(userId) || userId < 1 || (role !== "officer" && role !== "admin")) return null;
    return { userId, role } satisfies InternalSession;
  } catch {
    return null;
  }
}

export function internalCookieOptions(req: { protocol: string; headers: Record<string, unknown> }) {
  const forwarded = req.headers["x-forwarded-proto"];
  const secure = req.protocol === "https" || (typeof forwarded === "string" && forwarded.split(",").some(value => value.trim() === "https"));
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function isLoginRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key.toLowerCase());
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(key: string): void {
  const normalized = key.toLowerCase();
  const entry = loginAttempts.get(normalized);
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(normalized, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key.toLowerCase());
}

