import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toOverlayDTO } from '@/lib/dto';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const overlay = await prisma.overlay.findUnique({ where: { id: params.id } });
  if (!overlay) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  if (typeof body.x === 'number') data.x = clamp(body.x);
  if (typeof body.y === 'number') data.y = clamp(body.y);
  if (typeof body.width === 'number') data.width = clamp(body.width);
  if (typeof body.height === 'number') data.height = clamp(body.height);
  if (typeof body.url === 'string' && body.url.trim()) data.url = body.url.trim();
  if ('label' in body) data.label = body.label || null;
  if (typeof body.autoplay === 'boolean') data.autoplay = body.autoplay;

  const updated = await prisma.overlay.update({ where: { id: params.id }, data });
  return NextResponse.json(toOverlayDTO(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const overlay = await prisma.overlay.findUnique({ where: { id: params.id } });
  if (!overlay) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.overlay.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
