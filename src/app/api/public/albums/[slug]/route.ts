import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toAlbumDTO } from '@/lib/dto';
import { albumCookieName, verifyAlbumUnlockToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const album = await prisma.album.findUnique({
    where: { slug: params.slug },
    include: { pages: { include: { overlays: true }, orderBy: { order: 'asc' } } },
  });
  if (!album || !album.published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (album.passwordHash) {
    const token = req.cookies.get(albumCookieName(album.id))?.value;
    const unlocked = await verifyAlbumUnlockToken(token, album.id);
    if (!unlocked) {
      return NextResponse.json(
        { locked: true, title: album.title, slug: album.slug },
        { status: 401 },
      );
    }
  }

  return NextResponse.json(toAlbumDTO(album));
}
