import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { albumCookieName, verifyAlbumUnlockToken } from '@/lib/auth-edge';

export const runtime = 'nodejs';

async function loadImageBytes(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', imageUrl);
    return readFile(filePath);
  }
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${imageUrl}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const album = await prisma.album.findUnique({
    where: { slug: params.slug },
    include: { pages: { orderBy: { order: 'asc' } } },
  });
  if (!album || !album.published) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (album.passwordHash) {
    const token = req.cookies.get(albumCookieName(album.id))?.value;
    const unlocked = await verifyAlbumUnlockToken(token, album.id);
    if (!unlocked) return NextResponse.json({ error: 'Locked' }, { status: 401 });
  }

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(album.title);

  for (const page of album.pages) {
    const raw = await loadImageBytes(page.imageUrl);
    // pdf-lib only embeds PNG/JPG directly, not WebP, so normalize first.
    const png = await sharp(raw).png().toBuffer();
    const image = await pdfDoc.embedPng(png);
    const pdfPage = pdfDoc.addPage([image.width, image.height]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }

  const bytes = await pdfDoc.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${album.slug}.pdf"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
