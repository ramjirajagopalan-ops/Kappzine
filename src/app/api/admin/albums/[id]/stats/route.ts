import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const album = await prisma.album.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!album) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const views = await prisma.albumView.findMany({
    where: { albumId: album.id },
    select: { maxPageIndex: true, pageCount: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const totalViews = views.length;
  const avgCompletionPercent = totalViews
    ? Math.round(
        (views.reduce((sum, v) => sum + (v.pageCount > 1 ? v.maxPageIndex / (v.pageCount - 1) : 1), 0) / totalViews) * 100,
      )
    : 0;
  const completedViews = views.filter((v) => v.pageCount > 1 && v.maxPageIndex >= v.pageCount - 1).length;
  const lastViewedAt = views[0]?.updatedAt.toISOString() ?? null;

  return NextResponse.json({ totalViews, avgCompletionPercent, completedViews, lastViewedAt });
}
