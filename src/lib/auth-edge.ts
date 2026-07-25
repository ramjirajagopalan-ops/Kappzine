import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return encoder.encode(secret);
}

export const ADMIN_COOKIE = 'kz_admin';
export const albumCookieName = (albumId: string) => `kz_album_${albumId}`;

export async function createAdminSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export async function createAlbumUnlockToken(albumId: string): Promise<string> {
  return new SignJWT({ albumId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('60d')
    .sign(getSecret());
}

export async function verifyAlbumUnlockToken(token: string | undefined | null, albumId: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.albumId === albumId;
  } catch {
    return false;
  }
}
