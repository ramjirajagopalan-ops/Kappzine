import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { flipbookOptionsSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { getStorageForUser } from "@/server/storage";

async function requireOwnedFlipbook(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  const flipbook = await prisma.flipbook.findUnique({ where: { id } });
  if (!flipbook) return { error: NextResponse.json({ error: "not found" }, { status: 404 }) };
  if (flipbook.userId !== session.user.id) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { flipbook, userId: session.user.id };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedFlipbook(id);
  if ("error" in result) return result.error;

  const pages = await prisma.page.findMany({
    where: { flipbookId: id },
    orderBy: { pageNumber: "asc" },
    include: { hotspots: true },
  });

  return NextResponse.json({ flipbook: result.flipbook, pages });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedFlipbook(id);
  if ("error" in result) return result.error;

  const json = await req.json().catch(() => null);
  const parsed = flipbookOptionsSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };

  if (parsed.data.privacy === "PASSWORD" && password) {
    data.passwordHash = await hashPassword(password);
  } else if (parsed.data.privacy && parsed.data.privacy !== "PASSWORD") {
    data.passwordHash = null;
  }

  const flipbook = await prisma.flipbook.update({ where: { id }, data });
  return NextResponse.json({ flipbook });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await requireOwnedFlipbook(id);
  if ("error" in result) return result.error;

  const storage = await getStorageForUser(result.userId);
  const pages = await prisma.page.findMany({ where: { flipbookId: id } });

  const keysToDelete = [
    result.flipbook.originalFileKey,
    result.flipbook.backgroundImageKey,
    result.flipbook.brandLogoKey,
    result.flipbook.backgroundMusicKey,
    ...pages.flatMap((p) => [p.thumbKey, p.lowKey, p.highKey]),
  ].filter((k): k is string => Boolean(k));

  await Promise.allSettled(keysToDelete.map((key) => storage.delete(key)));
  await prisma.flipbook.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
