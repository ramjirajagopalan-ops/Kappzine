import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteImage } from '@/lib/storage';
import { toPageDTO } from '@/lib/dto';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if ('caption' in body) data.caption = body.caption || null;
  if (typeof body.isCover === 'boolean') data.isCover = body.isCover;
  if (typeof body.density === 'string' && ['hard', 'soft'].includes(body.density)) data.density = body.density;

  const updated = await prisma.page.update({ where: { id: params.id }, data, include: { overlays: true } });
  return NextResponse.json(toPageDTO(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await deleteImage(page.imageUrl);
  await prisma.page.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
