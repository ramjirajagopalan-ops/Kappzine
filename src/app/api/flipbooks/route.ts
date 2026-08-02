import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { createFlipbookSchema } from "@/lib/validation";
import { generateUniqueSlug } from "@/lib/slug";
import { hashPassword } from "@/lib/password";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const flipbooks = await prisma.flipbook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pages: true, viewEvents: true } } },
  });

  return NextResponse.json({ flipbooks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createFlipbookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, password, privacy, ...rest } = parsed.data;
  if (privacy === "PASSWORD" && !password) {
    return NextResponse.json(
      { error: "A password is required when privacy is set to PASSWORD." },
      { status: 400 }
    );
  }

  const slug = await generateUniqueSlug(title);
  const flipbook = await prisma.flipbook.create({
    data: {
      userId: session.user.id,
      title,
      slug,
      privacy: privacy ?? "UNLISTED",
      passwordHash: password ? await hashPassword(password) : null,
      ...rest,
    },
  });

  return NextResponse.json({ flipbook }, { status: 201 });
}
