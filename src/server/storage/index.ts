import { prisma } from "@/server/db";
import { LocalDiskProvider } from "./local";
import { GoogleDriveProvider } from "./googleDrive";
import type { StorageProvider } from "./types";

export type { StorageProvider } from "./types";

const localProvider = new LocalDiskProvider();

/**
 * Resolves the correct StorageProvider for a given user, based on their
 * `storageProvider` setting. Falls back to local disk if a user has GDRIVE
 * selected but hasn't finished connecting their Google account yet.
 */
export async function getStorageForUser(userId: string): Promise<StorageProvider> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.storageProvider !== "GDRIVE") return localProvider;
  if (!user.googleAccessToken || !user.googleRefreshToken) return localProvider;

  return new GoogleDriveProvider({
    accessToken: user.googleAccessToken,
    refreshToken: user.googleRefreshToken,
    expiryDate: user.googleTokenExpiry ? user.googleTokenExpiry.getTime() : null,
    rootFolderId: user.driveRootFolderId,
    onTokenRefresh: async ({ accessToken, expiryDate }) => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: accessToken,
          googleTokenExpiry: expiryDate ? new Date(expiryDate) : null,
        },
      });
    },
    onRootFolderCreated: async (folderId) => {
      if (folderId !== user.driveRootFolderId) {
        await prisma.user.update({
          where: { id: userId },
          data: { driveRootFolderId: folderId },
        });
      }
    },
  });
}

export function keyFor(
  userId: string,
  flipbookId: string,
  ...rest: string[]
): string {
  return ["users", userId, "flipbooks", flipbookId, ...rest].join("/");
}

export function contentTypeFor(ext: string): string {
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "webp":
      return "image/webp";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "mp3":
      return "audio/mpeg";
    default:
      return "application/octet-stream";
  }
}
