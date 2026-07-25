import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { saveImage } from '@/lib/storage';
import { toPageDTO } from '@/lib/dto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const album = await prisma.album.findUnique({ where: { id: params.id } });
  if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

  const form = await req.formData();
  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const last = await prisma.page.findFirst({ where: { albumId: album.id }, orderBy: { order: 'desc' } });
  let nextOrder = (last?.order ?? -1) + 1;

  const created = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await saveImage({ albumId: album.id, buffer });
    const page = await prisma.page.create({
      data: {
        albumId: album.id,
        order: nextOrder,
        imageUrl,
        isCover: nextOrder === 0,
        density: nextOrder === 0 ? 'hard' : 'soft',
      },
      include: { overlays: true },
    });
    created.push(toPageDTO(page));
    nextOrder += 1;
  }

  return NextResponse.json(created, { status: 201 });
}
