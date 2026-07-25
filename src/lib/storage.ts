import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';

const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');
const LOCAL_URL_PREFIX = '/uploads';

function useBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Resizes/normalizes an uploaded image and persists it, returning a URL
 * usable directly in an <img> tag. Uses Vercel Blob when configured
 * (required on Vercel's read-only serverless filesystem), otherwise
 * writes to the local public/uploads directory for self-hosted setups.
 */
export async function saveImage(params: {
  albumId: string;
  buffer: Buffer;
  maxDimension?: number;
}): Promise<string> {
  const { albumId, buffer, maxDimension = 1800 } = params;

  const processed = await sharp(buffer)
    .rotate() // apply EXIF orientation
    .resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer();

  const filename = `${uuid()}.webp`;

  if (useBlobStorage()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`albums/${albumId}/${filename}`, processed, {
      access: 'public',
      contentType: 'image/webp',
    });
    return blob.url;
  }

  const dir = path.join(LOCAL_UPLOAD_ROOT, albumId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), processed);
  return `${LOCAL_URL_PREFIX}/${albumId}/${filename}`;
}

export async function deleteImage(url: string): Promise<void> {
  if (!url) return;
  if (url.startsWith(LOCAL_URL_PREFIX)) {
    const relative = url.slice(LOCAL_URL_PREFIX.length);
    const filePath = path.join(LOCAL_UPLOAD_ROOT, relative);
    await unlink(filePath).catch(() => undefined);
    return;
  }
  if (useBlobStorage() && url.includes('.public.blob.vercel-storage.com')) {
    const { del } = await import('@vercel/blob');
    await del(url).catch(() => undefined);
  }
}
