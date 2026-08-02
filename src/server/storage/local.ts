import { promises as fs } from "fs";
import path from "path";
import type { StorageProvider } from "./types";

// turbopackIgnore: this is a runtime data directory, not a module import —
// resolving it dynamically must not pull the whole project into the trace.
const ROOT = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_LOCAL_ROOT || "./storage-data");

function resolvePath(key: string): string {
  const safe = key.replace(/^\/+/, "").replace(/\.\.+/g, "");
  return path.join(ROOT, safe);
}

export class LocalDiskProvider implements StorageProvider {
  readonly kind = "local" as const;

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(resolvePath(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }
}
