import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toAlbumDTO } from '@/lib/dto';
import { hashPassword } from '@/lib/auth';
import { deleteImage } from '@/lib/storage';
import { ASPECT_RATIOS, PAGE_MODES, THEMES } from '@/lib/validation';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const album = await prisma.album.findUnique({
    where: { id: params.id },
    include: { pages: { include: { overlays: true }, orderBy: { order: 'asc' } } },
  });
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(toAlbumDTO(album));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const album = await prisma.album.findUnique({ where: { id: params.id } });
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
  if ('coupleNames' in body) data.coupleNames = body.coupleNames || null;
  if ('description' in body) data.description = body.description || null;
  if ('eventDate' in body) data.eventDate = body.eventDate ? new Date(body.eventDate) : null;
  if (typeof body.theme === 'string' && THEMES.some((t) => t.id === body.theme)) data.theme = body.theme;
  if (typeof body.hardCovers === 'boolean') data.hardCovers = body.hardCovers;
  if (typeof body.pageMode === 'string' && (PAGE_MODES as readonly string[]).includes(body.pageMode)) {
    data.pageMode = body.pageMode;
  }
  if (typeof body.soundEnabled === 'boolean') data.soundEnabled = body.soundEnabled;
  if (typeof body.aspectRatio === 'string' && (ASPECT_RATIOS as readonly string[]).includes(body.aspectRatio)) {
    data.aspectRatio = body.aspectRatio;
  }
  if (typeof body.published === 'boolean') data.published = body.published;
  if ('password' in body) {
    data.passwordHash = body.password ? hashPassword(body.password) : null;
  }

  const updated = await prisma.album.update({
    where: { id: params.id },
    data,
    include: { pages: { include: { overlays: true }, orderBy: { order: 'asc' } } },
  });

  return NextResponse.json(toAlbumDTO(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const album = await prisma.album.findUnique({ where: { id: params.id }, include: { pages: true } });
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await Promise.all(album.pages.map((p) => deleteImage(p.imageUrl)));
  if (album.coverImageUrl) await deleteImage(album.coverImageUrl);
  await prisma.album.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
