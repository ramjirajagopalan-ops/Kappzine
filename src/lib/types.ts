export interface OverlayDTO {
  id: string;
  type: 'video' | 'audio' | 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
  label?: string | null;
  autoplay: boolean;
}

export interface PageDTO {
  id: string;
  order: number;
  imageUrl: string;
  caption?: string | null;
  isCover: boolean;
  density: 'hard' | 'soft';
  overlays: OverlayDTO[];
}

export interface AlbumDTO {
  id: string;
  slug: string;
  title: string;
  coupleNames?: string | null;
  eventDate?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  theme: string;
  hardCovers: boolean;
  pageMode: 'single' | 'double' | 'auto';
  soundEnabled: boolean;
  aspectRatio: string;
  hasPassword: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  pages: PageDTO[];
}

export interface AlbumSummaryDTO {
  id: string;
  slug: string;
  title: string;
  coupleNames?: string | null;
  coverImageUrl?: string | null;
  theme: string;
  published: boolean;
  hasPassword: boolean;
  pageCount: number;
  updatedAt: string;
}
