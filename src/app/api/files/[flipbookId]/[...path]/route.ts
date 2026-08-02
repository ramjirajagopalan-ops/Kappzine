import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getStorageForUser, keyFor, contentTypeFor } from "@/server/storage";
import { checkViewAccess } from "@/server/access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ flipbookId: string; path: string[] }> }
) {
  const { flipbookId, path } = await params;

  const flipbook = await prisma.flipbook.findUnique({ where: { id: flipbookId } });
  if (!flipbook) return NextResponse.json({ error: "not found" }, { status: 404 });

  const access = await checkViewAccess(flipbook);
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 403 });

  const storage = await getStorageForUser(flipbook.userId);
  const key = keyFor(flipbook.userId, flipbookId, ...path);

  let buffer: Buffer;
  try {
    buffer = await storage.get(key);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ext = path[path.length - 1]?.split(".").pop() ?? "";
  const isPublic = flipbook.privacy === "PUBLIC" || flipbook.privacy === "UNLISTED";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypeFor(ext),
      "Cache-Control": isPublic
        ? "public, max-age=86400, immutable"
        : "private, max-age=3600",
    },
  });
}
