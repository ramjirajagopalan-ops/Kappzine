import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { hotspotSchema } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const flipbook = await prisma.flipbook.findUnique({ where: { id } });
  if (!flipbook || flipbook.userId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = hotspotSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const page = await prisma.page.findUnique({ where: { id: parsed.data.pageId } });
  if (!page || page.flipbookId !== id) {
    return NextResponse.json({ error: "page not found on this flipbook" }, { status: 400 });
  }

  const hotspot = await prisma.hotspot.create({
    data: { flipbookId: id, ...parsed.data },
  });

  return NextResponse.json({ hotspot }, { status: 201 });
}
