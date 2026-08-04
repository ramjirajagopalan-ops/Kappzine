'use client';

import { useEffect, useRef, useState } from 'react';
import FlipBook, { FlipBookHandle } from '@/components/FlipBook';
import OverlayModal from '@/components/OverlayModal';
import TocDrawer from '@/components/TocDrawer';
import ZoomOverlay from '@/components/ZoomOverlay';
import SharePanel from '@/components/SharePanel';
import type { AlbumDTO, OverlayDTO } from '@/lib/types';
import { getTheme } from '@/lib/validation';
import {
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Grid2x2,
  Search,
  Share2,
  Printer,
  Play,
  Pause,
} from 'lucide-react';

function openPrintView(pages: AlbumDTO['pages']) {
  const win = window.open('', '_blank');
  if (!win) return;
  const imgs = pages
    .map((p) => `<img src="${p.imageUrl}" style="width:100%;display:block;page-break-after:always;" />`)
    .join('');
  win.document.write(`<!DOCTYPE html><html><head><title>Print</title></head><body style="margin:0">${imgs}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export default function AlbumViewer({ album }: { album: AlbumDTO }) {
  const theme = getTheme(album.theme);
  const flipRef = useRef<FlipBookHandle>(null);
  const [mode, setMode] = useState<'single' | 'double' | 'auto'>(album.pageMode);
  const [soundOn, setSoundOn] = useState(album.soundEnabled);
  const [activeOverlay, setActiveOverlay] = useState<OverlayDTO | null>(null);
  const [indicator, setIndicator] = useState({ index: 0, count: album.pages.length });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const maxPageRef = useRef(0);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      mainRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => undefined);
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => undefined);
    }
  }

  function pageLabel() {
    const { index, count } = indicator;
    if (index === 0) return 'Cover';
    if (index === count - 1) return 'Back Cover';
    return `Page ${index}`;
  }

  // View analytics: report once on load, then again whenever the deepest
  // page reached increases — the route itself only ever bumps forward, so
  // sending on every flip (not just unload) is safe and cheap.
  useEffect(() => {
    fetch(`/api/public/albums/${album.slug}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPageIndex: 0 }),
      keepalive: true,
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album.slug]);

  useEffect(() => {
    if (indicator.index <= maxPageRef.current) return;
    maxPageRef.current = indicator.index;
    fetch(`/api/public/albums/${album.slug}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPageIndex: indicator.index }),
      keepalive: true,
    }).catch(() => undefined);
  }, [indicator.index, album.slug]);

  useEffect(() => {
    if (!autoPlaying) return;
    const interval = setInterval(() => flipRef.current?.next(), 5000);
    return () => clearInterval(interval);
  }, [autoPlaying]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';

  return (
    <div className="flex h-[100dvh] flex-col" style={{ background: theme.bg }} ref={mainRef}>
      <header className="flex w-full items-center justify-between border-b border-white/5 px-6 py-5">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl tracking-wide text-stone-100">
            {album.coupleNames || album.title}
          </h1>
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">{pageLabel()}</div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
        <FlipBook
          ref={flipRef}
          pages={album.pages}
          theme={album.theme}
          aspectRatio={album.aspectRatio}
          pageMode={mode}
          soundEnabled={soundOn}
          onOverlayActivate={setActiveOverlay}
          onFlip={(index, count) => setIndicator({ index, count })}
        />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-white/15 p-1">
            {(['single', 'double'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors"
                style={
                  mode === m
                    ? { background: theme.accent, color: theme.bg, fontWeight: 600 }
                    : { color: 'rgba(214,211,209,.55)' }
                }
              >
                {m}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-white/10" />
          <ToolbarButton onClick={() => flipRef.current?.prev()} label="Previous page">
            <ChevronLeft size={17} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setSoundOn((s) => !s)} label="Toggle page-turn sound">
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </ToolbarButton>
          <ToolbarButton onClick={() => flipRef.current?.next()} label="Next page">
            <ChevronRight size={17} />
          </ToolbarButton>
          <div className="h-6 w-px bg-white/10" />
          <ToolbarButton onClick={() => setAutoPlaying((v) => !v)} label="Autoplay" active={autoPlaying}>
            {autoPlaying ? <Pause size={16} /> : <Play size={16} />}
          </ToolbarButton>
          <ToolbarButton onClick={() => setTocOpen(true)} label="Table of contents">
            <Grid2x2 size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setZoomSrc(album.pages[indicator.index]?.imageUrl ?? null)} label="Zoom">
            <Search size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setShareOpen(true)} label="Share">
            <Share2 size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => openPrintView(album.pages)} label="Print">
            <Printer size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={toggleFullscreen} label="Toggle fullscreen">
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </ToolbarButton>
        </div>
      </main>

      {activeOverlay && <OverlayModal overlay={activeOverlay} onClose={() => setActiveOverlay(null)} />}
      {tocOpen && (
        <TocDrawer
          pages={album.pages}
          currentIndex={indicator.index}
          accent={theme.accent}
          onJump={(i) => {
            flipRef.current?.goTo(i);
            setTocOpen(false);
          }}
          onClose={() => setTocOpen(false)}
        />
      )}
      {zoomSrc && <ZoomOverlay src={zoomSrc} onClose={() => setZoomSrc(null)} />}
      {shareOpen && <SharePanel url={shareUrl} onClose={() => setShareOpen(false)} />}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border transition-colors"
      style={
        active
          ? { borderColor: 'var(--brass)', color: '#b98d4a', background: 'rgba(185,141,74,.12)' }
          : { borderColor: 'rgba(255,255,255,.15)', color: 'rgb(214,211,209)' }
      }
    >
      {children}
    </button>
  );
}
