import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getStorageForUser } from "@/server/storage";
import { checkViewAccess } from "@/server/access";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flipbook = await prisma.flipbook.findUnique({ where: { id } });
  if (!flipbook || !flipbook.originalFileKey) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!flipbook.allowDownload) {
    return NextResponse.json({ error: "downloads are disabled for this flipbook" }, { status: 403 });
  }

  const access = await checkViewAccess(flipbook);
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const storage = await getStorageForUser(flipbook.userId);
  const buffer = await storage.get(flipbook.originalFileKey);

  await prisma.flipbook.update({ where: { id }, data: { downloadCount: { increment: 1 } } });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(flipbook.originalFileName || "flipbook.pdf").replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
