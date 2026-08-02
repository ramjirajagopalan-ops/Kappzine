import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/server/db";
import { checkViewAccess } from "@/server/access";
import { PasswordGate } from "@/components/viewer/PasswordGate";
import { FlipbookViewer } from "@/components/viewer/FlipbookViewer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const flipbook = await prisma.flipbook.findUnique({ where: { slug } });
  if (!flipbook) return {};
  return {
    title: flipbook.seoTitle || flipbook.title,
    description: flipbook.seoDescription || flipbook.description || undefined,
    robots: flipbook.privacy === "PUBLIC" ? undefined : { index: false, follow: false },
  };
}

export default async function PublicFlipbookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { slug } = await params;
  const { embed } = await searchParams;

  const flipbook = await prisma.flipbook.findUnique({ where: { slug } });
  if (!flipbook || flipbook.status !== "READY") notFound();

  const access = await checkViewAccess(flipbook);
  if (!access.allowed) {
    if (access.reason === "password_required") {
      return <PasswordGate slug={slug} title={flipbook.title} />;
    }
    notFound();
  }

  const pages = await prisma.page.findMany({
    where: { flipbookId: flipbook.id },
    orderBy: { pageNumber: "asc" },
    include: { hotspots: true },
  });

  const fileBase = `/api/files/${flipbook.id}`;
  const viewerPages = pages.map((p) => ({
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
  }));

  return (
    <FlipbookViewer
      flipbook={{
        id: flipbook.id,
        title: flipbook.title,
        description: flipbook.description,
        slug: flipbook.slug,
        pageCount: flipbook.pageCount,
        defaultViewMode: flipbook.defaultViewMode,
        rtl: flipbook.rtl,
        flipSound: flipbook.flipSound,
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
        backgroundStyle: flipbook.backgroundStyle,
        backgroundColor: flipbook.backgroundColor,
        accentColor: flipbook.accentColor,
        hardCovers: flipbook.hardCovers,
        embedAllowed: flipbook.embedAllowed,
      }}
      pages={viewerPages}
      embed={embed === "1"}
    />
  );
}
