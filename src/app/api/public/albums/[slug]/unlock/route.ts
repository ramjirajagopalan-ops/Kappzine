import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { albumCookieName, comparePassword, createAlbumUnlockToken } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const album = await prisma.album.findUnique({ where: { slug: params.slug } });
  if (!album || !album.published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!album.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!comparePassword(password, album.passwordHash)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const token = await createAlbumUnlockToken(album.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(albumCookieName(album.id), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 60,
  });
  return res;
}
