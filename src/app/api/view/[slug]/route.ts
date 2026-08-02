import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { checkViewAccess } from "@/server/access";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const flipbook = await prisma.flipbook.findUnique({ where: { slug } });
  if (!flipbook || flipbook.status !== "READY") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const access = await checkViewAccess(flipbook);
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const pages = await prisma.page.findMany({
    where: { flipbookId: flipbook.id },
    orderBy: { pageNumber: "asc" },
    include: { hotspots: true },
  });

  const fileBase = `/api/files/${flipbook.id}`;

  return NextResponse.json({
    flipbook: {
      id: flipbook.id,
      title: flipbook.title,
      description: flipbook.description,
      slug: flipbook.slug,
      pageCount: flipbook.pageCount,
      defaultViewMode: flipbook.defaultViewMode,
      rtl: flipbook.rtl,
      flipSound: flipbook.flipSound,
      backgroundMusicUrl: flipbook.backgroundMusicKey ? `${fileBase}/${flipbook.backgroundMusicKey.split("/").slice(-1)}` : null,
      autoFlipEnabled: flipbook.autoFlipEnabled,
      autoFlipSeconds: flipbook.autoFlipSeconds,
      showToc: flipbook.showToc,
      showThumbnails: flipbook.showThumbnails,
      showDownloadBtn: flipbook.showDownloadBtn,
      showShareBtn: flipbook.showShareBtn,
      showPrintBtn: flipbook.showPrintBtn,
      allowDownload: flipbook.allowDownload,
      allowSearch: flipbook.allowSearch,
      allowZoom: flipbook.allowZoom,
      cornerFlipZones: flipbook.cornerFlipZones,
      backgroundStyle: flipbook.backgroundStyle,
      backgroundColor: flipbook.backgroundColor,
      backgroundImageUrl: flipbook.backgroundImageKey ? `${fileBase}/background.webp` : null,
      brandLogoUrl: flipbook.brandLogoKey ? `${fileBase}/logo.webp` : null,
      brandLogoLinkUrl: flipbook.brandLogoLinkUrl,
      accentColor: flipbook.accentColor,
      pageCornerRadius: flipbook.pageCornerRadius,
      hardCovers: flipbook.hardCovers,
      embedAllowed: flipbook.embedAllowed,
      viewCount: flipbook.viewCount,
    },
    pages: pages.map((p) => ({
      id: p.id,
      pageNumber: p.pageNumber,
      width: p.width,
      height: p.height,
      thumbUrl: `${fileBase}/pages/${p.pageNumber}/thumb.webp`,
      lowUrl: `${fileBase}/pages/${p.pageNumber}/low.webp`,
      highUrl: `${fileBase}/pages/${p.pageNumber}/high.webp`,
      text: flipbook.allowSearch ? p.textContent : null,
      hotspots: p.hotspots.map((h) => ({
        id: h.id,
        type: h.type,
        x: h.x,
        y: h.y,
        width: h.width,
        height: h.height,
        url: h.url,
        caption: h.caption,
      })),
    })),
  });
}
