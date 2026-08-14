import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredObject = {
  backend: "local" | "r2";
  objectKey: string;
  checksumSha256: string;
  sizeBytes: number;
};

export type StorageAdapter = {
  backend: "local" | "r2";
  put: (objectKey: string, bytes: Buffer) => Promise<StoredObject>;
  get: (objectKey: string) => Promise<Buffer>;
  remove: (objectKey: string) => Promise<void>;
};

function uploadsRoot() {
  return path.resolve(process.cwd(), process.env.STORAGE_DIR ?? ".data/uploads");
}

export function createLocalStorage(): StorageAdapter {
  return {
    backend: "local",
    async put(objectKey, bytes) {
      const full = path.join(uploadsRoot(), objectKey);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, bytes);
      return {
        backend: "local",
        objectKey,
        checksumSha256: createHash("sha256").update(bytes).digest("hex"),
        sizeBytes: bytes.byteLength,
      };
    },
    async get(objectKey) {
      return readFile(path.join(uploadsRoot(), objectKey));
    },
    async remove(objectKey) {
      await unlink(path.join(uploadsRoot(), objectKey)).catch(() => undefined);
    },
  };
}

export function getStorage(): StorageAdapter {
  return createLocalStorage();
}

export function documentObjectKey(entityType: string, entityId: string, originalName: string) {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return `${entityType}/${entityId}/${crypto.randomUUID()}-${safe}`;
}
