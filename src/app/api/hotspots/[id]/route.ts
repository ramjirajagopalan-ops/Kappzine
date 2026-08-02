import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

async function requireOwnedHotspot(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  const hotspot = await prisma.hotspot.findUnique({ where: { id }, include: { flipbook: true } });
  if (!hotspot) return { error: NextResponse.json({ error: "not found" }, { status: 404 }) };
  if (hotspot.flipbook.userId !== session.user.id) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { hotspot };
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedHotspot(id);
  if ("error" in result) return result.error;

  await prisma.hotspot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
