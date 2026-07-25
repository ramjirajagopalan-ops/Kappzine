import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const order: unknown = body?.order;
  if (!Array.isArray(order) || !order.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'order must be an array of page ids' }, { status: 400 });
  }

  const pages = await prisma.page.findMany({ where: { albumId: params.id }, select: { id: true } });
  const validIds = new Set(pages.map((p) => p.id));
  if (order.length !== pages.length || !order.every((id) => validIds.has(id))) {
    return NextResponse.json({ error: 'order must contain exactly the album’s current page ids' }, { status: 400 });
  }

  await prisma.$transaction(order.map((id, index) => prisma.page.update({ where: { id }, data: { order: index } })));

  return NextResponse.json({ ok: true });
}
