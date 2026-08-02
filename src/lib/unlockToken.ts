import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 1000 * 60 * 60 * 24 * 7; // a password unlock lasts a week

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Issues a signed token proving the bearer supplied the right password for `flipbookId`. */
export function issueUnlockToken(flipbookId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${flipbookId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyUnlockToken(token: string, flipbookId: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenFlipbookId, expiresRaw, signature] = parts;
  if (tokenFlipbookId !== flipbookId) return false;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  const expected = sign(`${tokenFlipbookId}.${expiresRaw}`);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export function unlockCookieName(flipbookId: string): string {
  return `fb_unlock_${flipbookId}`;
}
