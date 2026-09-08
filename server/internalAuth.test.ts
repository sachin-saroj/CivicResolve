import { describe, expect, it } from "vitest";
import {
  clearLoginAttempts,
  createInternalSession,
  hashPassword,
  isLoginRateLimited,
  recordFailedLogin,
  verifyInternalSession,
  verifyPassword,
} from "./internalAuth";

describe("internal authentication", () => {
  it("hashes passwords and rejects incorrect credentials", () => {
    const encoded = hashPassword("correct-horse-battery-staple");
    expect(encoded).toMatch(/^scrypt:[^:]+:[a-f0-9]+$/);
    expect(verifyPassword("correct-horse-battery-staple", encoded)).toBe(true);
    expect(verifyPassword("wrong-password", encoded)).toBe(false);
  });

  it("creates a role-scoped session and rejects tampering", async () => {
    const token = await createInternalSession({ id: 42, role: "officer" });
    await expect(verifyInternalSession(token)).resolves.toEqual({ userId: 42, role: "officer" });
    await expect(verifyInternalSession(`${token}tampered`)).resolves.toBeNull();
    await expect(verifyInternalSession(undefined)).resolves.toBeNull();
  });

  it("throttles repeated failed login attempts for an email", () => {
    const testEmail = "rate-limit-test@civicresolve.internal";
    clearLoginAttempts(testEmail);

    expect(isLoginRateLimited(testEmail)).toBe(false);

    for (let i = 0; i < 4; i++) {
      recordFailedLogin(testEmail);
      expect(isLoginRateLimited(testEmail)).toBe(false);
    }

    recordFailedLogin(testEmail);
    expect(isLoginRateLimited(testEmail)).toBe(true);

    clearLoginAttempts(testEmail);
    expect(isLoginRateLimited(testEmail)).toBe(false);
  });
});

