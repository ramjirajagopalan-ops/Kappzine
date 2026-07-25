'use client';

import { useRef, useState } from 'react';
import FlipBook, { FlipBookHandle } from '@/components/FlipBook';
import OverlayModal from '@/components/OverlayModal';
import type { AlbumDTO, OverlayDTO } from '@/lib/types';
import { getTheme } from '@/lib/validation';

export default function AlbumViewer({ album }: { album: AlbumDTO }) {
  const theme = getTheme(album.theme);
  const flipRef = useRef<FlipBookHandle>(null);
  const [mode, setMode] = useState<'single' | 'double' | 'auto'>(album.pageMode);
  const [soundOn, setSoundOn] = useState(album.soundEnabled);
  const [activeOverlay, setActiveOverlay] = useState<OverlayDTO | null>(null);
  const [indicator, setIndicator] = useState({ index: 0, count: album.pages.length });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{ background: theme.bg }}
      ref={mainRef}
    >
      <header className="flex w-full items-center justify-between border-b border-white/5 px-6 py-5">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-xl tracking-wide text-stone-100">
            {album.coupleNames || album.title}
          </h1>
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">{pageLabel()}</div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6">
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

        <div className="flex items-center gap-4">
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
          <button
            onClick={() => flipRef.current?.prev()}
            aria-label="Previous page"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-stone-300 transition-colors hover:border-brass hover:text-brass"
          >
            ‹
          </button>
          <button
            onClick={() => setSoundOn((s) => !s)}
            aria-label="Toggle page-turn sound"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-stone-300 transition-colors hover:border-brass hover:text-brass"
            title={soundOn ? 'Sound on' : 'Sound off'}
          >
            {soundOn ? '🔊' : '🔇'}
          </button>
          <button
            onClick={() => flipRef.current?.next()}
            aria-label="Next page"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-stone-300 transition-colors hover:border-brass hover:text-brass"
          >
            ›
          </button>
          <div className="h-6 w-px bg-white/10" />
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-stone-300 transition-colors hover:border-brass hover:text-brass"
          >
            {isFullscreen ? '⤡' : '⤢'}
          </button>
        </div>
      </main>

      {activeOverlay && <OverlayModal overlay={activeOverlay} onClose={() => setActiveOverlay(null)} />}
    </div>
  );
}
