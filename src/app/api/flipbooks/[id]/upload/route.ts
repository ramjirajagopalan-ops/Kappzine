import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { getStorageForUser, keyFor, contentTypeFor } from "@/server/storage";
import { enqueueProcessing } from "@/server/jobs/queue";

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024; // 250MB — generous for a scanned magazine PDF

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const flipbook = await prisma.flipbook.findUnique({ where: { id } });
  if (!flipbook) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (flipbook.userId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "only PDF files are supported" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "file exceeds the 250MB upload limit" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = await getStorageForUser(session.user.id);
  const key = keyFor(session.user.id, id, "original.pdf");
  await storage.put(key, buffer, contentTypeFor("pdf"));

  await prisma.flipbook.update({
    where: { id },
    data: {
      originalFileKey: key,
      originalFileName: file.name,
      originalFileSize: file.size,
      status: "UPLOADING",
      processedPages: 0,
    },
  });

  await enqueueProcessing(id);

  return NextResponse.json({ ok: true });
}
