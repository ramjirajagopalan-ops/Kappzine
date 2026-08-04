import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

const SESSION_COOKIE = 'kz_vsession';

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const album = await prisma.album.findUnique({
    where: { slug: params.slug },
    select: { id: true, published: true, pages: { select: { id: true } } },
  });
  if (!album || !album.published) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const maxPageIndex = Math.max(0, Math.min(Number(body?.maxPageIndex) || 0, album.pages.length - 1));

  let sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  const isNewSession = !sessionId;
  if (!sessionId) sessionId = randomUUID();

  // Create the row on first view; on later calls only bump maxPageIndex
  // forward (a later call with a smaller index just means the visitor
  // flipped back, which shouldn't shrink their recorded progress).
  await prisma.albumView.upsert({
    where: { albumId_sessionId: { albumId: album.id, sessionId } },
    update: { pageCount: album.pages.length },
    create: { albumId: album.id, sessionId, maxPageIndex, pageCount: album.pages.length },
  });
  await prisma.albumView.updateMany({
    where: { albumId: album.id, sessionId, maxPageIndex: { lt: maxPageIndex } },
    data: { maxPageIndex },
  });

  const res = NextResponse.json({ ok: true });
  if (isNewSession) {
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
