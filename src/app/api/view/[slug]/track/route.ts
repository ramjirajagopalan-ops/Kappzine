import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const flipbook = await prisma.flipbook.findUnique({ where: { slug } });
  if (!flipbook) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 100) : null;
  const maxPageReached = Number.isFinite(body?.maxPageReached) ? Math.max(0, Math.trunc(body.maxPageReached)) : 0;
  const durationSeconds = Number.isFinite(body?.durationSeconds) ? Math.max(0, Math.trunc(body.durationSeconds)) : 0;
  const referrer = typeof body?.referrer === "string" ? body.referrer.slice(0, 500) : null;
  const deviceType = typeof body?.deviceType === "string" ? body.deviceType.slice(0, 20) : null;

  if (!sessionId) return NextResponse.json({ error: "missing sessionId" }, { status: 400 });

  const existing = await prisma.viewEvent.findUnique({
    where: { flipbookId_sessionId: { flipbookId: flipbook.id, sessionId } },
  });

  await prisma.viewEvent.upsert({
    where: { flipbookId_sessionId: { flipbookId: flipbook.id, sessionId } },
    create: { flipbookId: flipbook.id, sessionId, referrer, deviceType, maxPageReached, durationSeconds },
    update: {
      maxPageReached: Math.max(maxPageReached, existing?.maxPageReached ?? 0),
      durationSeconds,
    },
  });

  if (!existing) {
    await prisma.flipbook.update({ where: { id: flipbook.id }, data: { viewCount: { increment: 1 } } });
  }

  return NextResponse.json({ ok: true });
}
