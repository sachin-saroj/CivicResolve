import fs from "node:fs/promises";
import path from "node:path";

export interface StorageProvider {
  put(key: string, data: Buffer, mimeType: string): Promise<{ key: string; url: string }>;
  get(key: string): Promise<{ data: Buffer; mimeType: string } | null>;
  delete?(key: string): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir = "./uploads") {
    this.baseDir = path.resolve(process.cwd(), baseDir);
  }

  private resolveSafePath(relKey: string): string {
    const cleanKey = relKey.replace(/^\/+/, "").replace(/\.\./g, "");
    const fullPath = path.resolve(this.baseDir, cleanKey);
    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error("Path traversal detected");
    }
    return fullPath;
  }

  async put(relKey: string, data: Buffer, mimeType: string): Promise<{ key: string; url: string }> {
    const cleanKey = relKey.replace(/^\/+/, "");
    const fullPath = this.resolveSafePath(cleanKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return { key: cleanKey, url: `/api/attachments/${encodeURIComponent(cleanKey)}` };
  }

  async get(relKey: string): Promise<{ data: Buffer; mimeType: string } | null> {
    const fullPath = this.resolveSafePath(relKey);
    try {
      const data = await fs.readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      let mimeType = "application/octet-stream";
      if (ext === ".pdf") mimeType = "application/pdf";
      else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".png") mimeType = "image/png";
      else if (ext === ".webp") mimeType = "image/webp";
      return { data, mimeType };
    } catch (err: any) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(relKey: string): Promise<void> {
    const fullPath = this.resolveSafePath(relKey);
    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  }
}

// Global active storage provider instance
let activeProvider: StorageProvider = new LocalStorageProvider();

export function getStorageProvider(): StorageProvider {
  return activeProvider;
}

export function setStorageProvider(provider: StorageProvider): void {
  activeProvider = provider;
}
