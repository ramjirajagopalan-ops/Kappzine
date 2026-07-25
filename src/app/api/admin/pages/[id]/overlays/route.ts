import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toOverlayDTO } from '@/lib/dto';
import { isValidOverlayType } from '@/lib/validation';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const page = await prisma.page.findUnique({ where: { id: params.id } });
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!isValidOverlayType(body.type)) {
    return NextResponse.json({ error: 'Invalid overlay type' }, { status: 400 });
  }
  if (typeof body.url !== 'string' || !body.url.trim()) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const clamp = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : fallback;
    return Math.min(100, Math.max(0, n));
  };

  const overlay = await prisma.overlay.create({
    data: {
      pageId: page.id,
      type: body.type,
      url: body.url.trim(),
      label: body.label || null,
      autoplay: Boolean(body.autoplay),
      x: clamp(body.x, 35),
      y: clamp(body.y, 35),
      width: clamp(body.width, 30),
      height: clamp(body.height, 30),
    },
  });

  return NextResponse.json(toOverlayDTO(overlay), { status: 201 });
}
