import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import type { StorageProvider, UserStorageContext } from "./types";

const APP_FOLDER_NAME = "Kappzine Flipbooks";
const LOGICAL_KEY_PROP = "kappzineKey";

function flattenKey(key: string): string {
  return key.replace(/^\/+/, "").replace(/\//g, "__");
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Files are stored flat inside one app-owned Drive folder, tagged with an
 * `appProperties.kappzineKey` value equal to our logical key. That avoids
 * recreating nested folder trees for every asset (thumbnails/lowres/highres
 * per page adds up fast) while still letting us look files up by key alone.
 */
export class GoogleDriveProvider implements StorageProvider {
  readonly kind = "gdrive" as const;

  private drive: drive_v3.Drive;
  private rootFolderIdPromise: Promise<string>;

  constructor(private ctx: NonNullable<UserStorageContext["google"]>) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: ctx.accessToken,
      refresh_token: ctx.refreshToken,
      expiry_date: ctx.expiryDate ?? undefined,
    });
    oauth2Client.on("tokens", (tokens) => {
      if (tokens.access_token) {
        void ctx.onTokenRefresh({
          accessToken: tokens.access_token,
          expiryDate: tokens.expiry_date ?? null,
        });
      }
    });

    this.drive = google.drive({ version: "v3", auth: oauth2Client });
    this.rootFolderIdPromise = ctx.rootFolderId
      ? Promise.resolve(ctx.rootFolderId)
      : this.ensureRootFolder();
  }

  private async ensureRootFolder(): Promise<string> {
    const existing = await this.drive.files.list({
      q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`,
      fields: "files(id, name)",
      spaces: "drive",
    });
    const found = existing.data.files?.[0];
    if (found?.id) {
      await this.ctx.onRootFolderCreated(found.id);
      return found.id;
    }

    const created = await this.drive.files.create({
      requestBody: {
        name: APP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });
    const id = created.data.id!;
    await this.ctx.onRootFolderCreated(id);
    return id;
  }

  private async findFileId(key: string): Promise<string | null> {
    const rootFolderId = await this.rootFolderIdPromise;
    const q = [
      `'${rootFolderId}' in parents`,
      "trashed=false",
      `appProperties has { key='${LOGICAL_KEY_PROP}' and value='${escapeQueryValue(key)}' }`,
    ].join(" and ");
    const res = await this.drive.files.list({
      q,
      fields: "files(id)",
      spaces: "drive",
    });
    return res.data.files?.[0]?.id ?? null;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const rootFolderId = await this.rootFolderIdPromise;
    const existingId = await this.findFileId(key);
    const media = { mimeType: contentType, body: Readable.from(data) };

    if (existingId) {
      await this.drive.files.update({ fileId: existingId, media });
      return;
    }

    await this.drive.files.create({
      requestBody: {
        name: flattenKey(key),
        parents: [rootFolderId],
        appProperties: { [LOGICAL_KEY_PROP]: key },
      },
      media,
      fields: "id",
    });
  }

  async get(key: string): Promise<Buffer> {
    const fileId = await this.findFileId(key);
    if (!fileId) throw new Error(`GoogleDriveProvider: key not found: ${key}`);

    const res = await this.drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data as ArrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const fileId = await this.findFileId(key);
    if (!fileId) return;
    await this.drive.files.delete({ fileId });
  }

  async exists(key: string): Promise<boolean> {
    return (await this.findFileId(key)) !== null;
  }
}
