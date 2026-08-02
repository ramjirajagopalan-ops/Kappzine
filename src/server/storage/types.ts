/**
 * Provider-agnostic object storage. A "key" is a logical path
 * (e.g. `users/<id>/flipbooks/<id>/pages/3/high.webp`) that both the
 * local-disk and Google Drive implementations resolve on their own terms —
 * callers never see filesystem paths or Drive file ids directly.
 */
export interface StorageProvider {
  readonly kind: "local" | "gdrive";

  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface UserStorageContext {
  userId: string;
  // Present only when kind === "gdrive"; the caller (worker/API routes)
  // fetches/refreshes these from the User row before building the provider.
  google?: {
    accessToken: string;
    refreshToken: string;
    expiryDate: number | null;
    rootFolderId: string | null;
    onTokenRefresh: (tokens: {
      accessToken: string;
      expiryDate: number | null;
    }) => Promise<void>;
    onRootFolderCreated: (folderId: string) => Promise<void>;
  };
}
