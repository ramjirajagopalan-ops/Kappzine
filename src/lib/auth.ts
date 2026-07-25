import bcrypt from 'bcryptjs';

export * from '@/lib/auth-edge';

export function checkAdminPassword(candidate: string): boolean {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) return bcrypt.compareSync(candidate, hash);
  const plain = process.env.ADMIN_PASSWORD;
  if (plain) return candidate === plain;
  return false;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
