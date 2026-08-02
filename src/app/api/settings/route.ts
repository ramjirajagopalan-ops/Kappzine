import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, storageProvider: true, googleRefreshToken: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      storageProvider: user.storageProvider,
      googleDriveConnected: Boolean(user.googleRefreshToken),
    },
  });
}

const patchSchema = z.object({ storageProvider: z.enum(["LOCAL", "GDRIVE"]) });

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.storageProvider === "GDRIVE") {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.googleRefreshToken) {
      return NextResponse.json(
        { error: "Connect Google Drive first by signing in with Google." },
        { status: 400 }
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { storageProvider: parsed.data.storageProvider },
  });

  return NextResponse.json({ storageProvider: user.storageProvider });
}
