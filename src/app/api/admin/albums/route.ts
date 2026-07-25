import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toAlbumSummaryDTO } from '@/lib/dto';
import { hashPassword } from '@/lib/auth';
import slugify from 'slugify';

export async function GET() {
  const albums = await prisma.album.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { pages: { select: { id: true, imageUrl: true, order: true } } },
  });
  return NextResponse.json(albums.map(toAlbumSummaryDTO));
}

async function uniqueSlug(base: string) {
  let slug = slugify(base, { lower: true, strict: true }) || 'album';
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.album.findUnique({ where: { slug } });
    if (!existing) return slug;
    n += 1;
    slug = `${slugify(base, { lower: true, strict: true }) || 'album'}-${n}`;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const slug = await uniqueSlug(body?.slug || title);
  const password: string | undefined = typeof body?.password === 'string' && body.password ? body.password : undefined;

  const album = await prisma.album.create({
    data: {
      title,
      slug,
      coupleNames: body?.coupleNames || null,
      passwordHash: password ? hashPassword(password) : null,
    },
    include: { pages: { select: { id: true, imageUrl: true, order: true } } },
  });

  return NextResponse.json(toAlbumSummaryDTO(album), { status: 201 });
}
