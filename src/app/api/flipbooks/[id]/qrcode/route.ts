import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const flipbook = await prisma.flipbook.findUnique({ where: { id } });
  if (!flipbook || flipbook.userId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const appUrl = process.env.APP_URL || new URL(req.url).origin;
  const shareUrl = `${appUrl}/f/${flipbook.slug}`;

  const png = await QRCode.toBuffer(shareUrl, { width: 480, margin: 2 });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
    },
  });
}
