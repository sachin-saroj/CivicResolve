export const INSECURE_JWT_SECRETS = [
  "civic-resolve-default-dev-secret-key-at-least-32-chars",
  "change-this-to-a-secure-random-secret-in-production-min-32-chars",
  "test-jwt-secret-key-at-least-32-chars-long",
] as const;

export function validateJwtSecret(secret: string | undefined, isProduction: boolean): string {
  if (isProduction) {
    if (!secret || secret.trim().length === 0) {
      throw new Error("JWT_SECRET must be set in production.");
    }
    if (secret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
    if (INSECURE_JWT_SECRETS.includes(secret as any)) {
      throw new Error("JWT_SECRET cannot be a known default or placeholder in production.");
    }
    return secret;
  }
  return secret || INSECURE_JWT_SECRETS[0];
}

const isProduction = process.env.NODE_ENV === "production";
const validatedCookieSecret = validateJwtSecret(process.env.JWT_SECRET, isProduction);

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: validatedCookieSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

