// Production-grade decoupled storage interface
// Defaults to LocalStorageProvider with safe disk persistence and path traversal defense.
// Falls back to Forge Server presigned PUT only if configured.

import { ENV } from "./_core/env";
import { getStorageProvider } from "./storageProvider";

function hasForgeConfig(): boolean {
  return Boolean(ENV.forgeApiUrl && ENV.forgeApiKey);
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\.\./g, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const buffer = Buffer.isBuffer(data)
    ? data
    : typeof data === "string"
      ? Buffer.from(data)
      : Buffer.from(data);

  if (hasForgeConfig()) {
    try {
      const forgeUrl = ENV.forgeApiUrl!.replace(/\/+$/, "");
      const forgeKey = ENV.forgeApiKey!;
      const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
      presignUrl.searchParams.set("path", key);
      const presignResp = await fetch(presignUrl, {
        headers: { Authorization: `Bearer ${forgeKey}` },
      });
      if (presignResp.ok) {
        const { url: s3Url } = (await presignResp.json()) as { url: string };
        if (s3Url) {
          const blob = new Blob([buffer as any], { type: contentType });
          const uploadResp = await fetch(s3Url, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: blob,
          });
          if (uploadResp.ok) {
            return { key, url: `/api/attachments/${encodeURIComponent(key)}` };
          }
        }
      }
    } catch {
      // Fallback gracefully to local storage provider
    }
  }

  // Reliable default: LocalStorageProvider
  const provider = getStorageProvider();
  return provider.put(key, buffer, contentType);
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/api/attachments/${encodeURIComponent(key)}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return `/api/attachments/${encodeURIComponent(key)}`;
}
