import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { verifyPassword } from "@/lib/password";
import { issueUnlockToken, unlockCookieName } from "@/lib/unlockToken";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const flipbook = await prisma.flipbook.findUnique({ where: { slug } });
  if (!flipbook || flipbook.privacy !== "PASSWORD" || !flipbook.passwordHash) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const ok = await verifyPassword(password, flipbook.passwordHash);
  if (!ok) return NextResponse.json({ error: "incorrect password" }, { status: 401 });

  const token = issueUnlockToken(flipbook.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(unlockCookieName(flipbook.id), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
