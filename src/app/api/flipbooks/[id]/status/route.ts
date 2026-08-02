import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const flipbook = await prisma.flipbook.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      pageCount: true,
      processedPages: true,
      errorMessage: true,
      userId: true,
      slug: true,
    },
  });
  if (!flipbook || flipbook.userId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: flipbook.status,
    pageCount: flipbook.pageCount,
    processedPages: flipbook.processedPages,
    errorMessage: flipbook.errorMessage,
    slug: flipbook.slug,
  });
}
