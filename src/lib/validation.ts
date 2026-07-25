export const PAGE_MODES = ['single', 'double', 'auto'] as const;
export type PageMode = (typeof PAGE_MODES)[number];

export const OVERLAY_TYPES = ['video', 'audio', 'link'] as const;
export type OverlayType = (typeof OVERLAY_TYPES)[number];

export const ASPECT_RATIOS = ['3:4', '4:5', '1:1', '16:9', '5:7'] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export interface ThemeDefinition {
  id: string;
  label: string;
  bg: string;
  pageBg: string;
  pageText: string;
  accent: string;
  pageTexture?: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'classic-brass',
    label: 'Classic Brass',
    bg: '#171512',
    pageBg: '#efe8d8',
    pageText: '#171512',
    accent: '#b98d4a',
  },
  {
    id: 'blush',
    label: 'Blush Romance',
    bg: '#241318',
    pageBg: '#fbe9ee',
    pageText: '#3a1420',
    accent: '#d98aa0',
  },
  {
    id: 'midnight',
    label: 'Midnight Navy',
    bg: '#05070f',
    pageBg: '#101830',
    pageText: '#e7ecf7',
    accent: '#6f9ce8',
  },
  {
    id: 'ivory',
    label: 'Ivory Minimal',
    bg: '#e9e5da',
    pageBg: '#ffffff',
    pageText: '#22201b',
    accent: '#a08a5f',
  },
  {
    id: 'botanical',
    label: 'Botanical Green',
    bg: '#101a12',
    pageBg: '#eef2e6',
    pageText: '#1c2a1a',
    accent: '#6f9457',
  },
];

export function getTheme(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function aspectRatioToWH(ratio: string): { w: number; h: number } {
  const [w, h] = ratio.split(':').map(Number);
  if (!w || !h) return { w: 3, h: 4 };
  return { w, h };
}

export function isValidPageMode(value: unknown): value is PageMode {
  return typeof value === 'string' && (PAGE_MODES as readonly string[]).includes(value);
}

export function isValidOverlayType(value: unknown): value is OverlayType {
  return typeof value === 'string' && (OVERLAY_TYPES as readonly string[]).includes(value);
}
