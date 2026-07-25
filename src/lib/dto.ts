import type { Album, Overlay, Page } from '@prisma/client';
import type { AlbumDTO, AlbumSummaryDTO, OverlayDTO, PageDTO } from '@/lib/types';

type AlbumWithPages = Album & { pages: (Page & { overlays: Overlay[] })[] };

export function toOverlayDTO(overlay: Overlay): OverlayDTO {
  return {
    id: overlay.id,
    type: overlay.type as OverlayDTO['type'],
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: overlay.height,
    url: overlay.url,
    label: overlay.label,
    autoplay: overlay.autoplay,
  };
}

export function toPageDTO(page: Page & { overlays: Overlay[] }): PageDTO {
  return {
    id: page.id,
    order: page.order,
    imageUrl: page.imageUrl,
    caption: page.caption,
    isCover: page.isCover,
    density: page.density as PageDTO['density'],
    overlays: page.overlays.map(toOverlayDTO),
  };
}

export function toAlbumDTO(album: AlbumWithPages): AlbumDTO {
  return {
    id: album.id,
    slug: album.slug,
    title: album.title,
    coupleNames: album.coupleNames,
    eventDate: album.eventDate ? album.eventDate.toISOString() : null,
    description: album.description,
    coverImageUrl: album.coverImageUrl,
    theme: album.theme,
    hardCovers: album.hardCovers,
    pageMode: album.pageMode as AlbumDTO['pageMode'],
    soundEnabled: album.soundEnabled,
    aspectRatio: album.aspectRatio,
    hasPassword: Boolean(album.passwordHash),
    published: album.published,
    createdAt: album.createdAt.toISOString(),
    updatedAt: album.updatedAt.toISOString(),
    pages: [...album.pages].sort((a, b) => a.order - b.order).map(toPageDTO),
  };
}

export function toAlbumSummaryDTO(
  album: Album & { pages: { id: string; imageUrl: string; order: number }[] },
): AlbumSummaryDTO {
  const firstPage = [...album.pages].sort((a, b) => a.order - b.order)[0];
  return {
    id: album.id,
    slug: album.slug,
    title: album.title,
    coupleNames: album.coupleNames,
    coverImageUrl: album.coverImageUrl || firstPage?.imageUrl || null,
    theme: album.theme,
    published: album.published,
    hasPassword: Boolean(album.passwordHash),
    pageCount: album.pages.length,
    updatedAt: album.updatedAt.toISOString(),
  };
}
