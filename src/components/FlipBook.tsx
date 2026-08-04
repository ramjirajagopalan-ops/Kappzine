'use client';

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import type { PageFlip as PageFlipInstance, SizeType } from 'page-flip';
import type { OverlayDTO, PageDTO } from '@/lib/types';
import { getTheme, aspectRatioToWH } from '@/lib/validation';
import { playPageTurnSound } from '@/lib/sound';

export interface FlipBookHandle {
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

interface FlipBookProps {
  pages: PageDTO[];
  theme: string;
  aspectRatio: string;
  pageMode: 'single' | 'double' | 'auto';
  soundEnabled: boolean;
  onOverlayActivate: (overlay: OverlayDTO) => void;
  onFlip?: (index: number, count: number) => void;
}

function overlayIcon(type: OverlayDTO['type']) {
  if (type === 'video') return '▶';
  if (type === 'audio') return '♪';
  return '↗';
}

function buildPageElement(page: PageDTO, theme: ReturnType<typeof getTheme>, onOverlayActivate: (o: OverlayDTO) => void) {
  const el = document.createElement('div');
  el.className = 'kz-page';
  el.style.background = theme.pageBg;
  el.style.color = theme.pageText;
  if (page.density === 'hard') el.dataset.density = 'hard';

  const img = document.createElement('img');
  img.src = page.imageUrl;
  img.draggable = false;
  img.alt = page.caption || '';
  el.appendChild(img);

  if (page.isCover && page.caption) {
    const cover = document.createElement('div');
    cover.className = 'kz-cover-title';
    const h2 = document.createElement('h2');
    h2.className = 'font-display';
    h2.textContent = page.caption;
    cover.appendChild(h2);
    const rule = document.createElement('div');
    rule.className = 'kz-cover-rule';
    rule.style.background = theme.accent;
    cover.appendChild(rule);
    el.appendChild(cover);
  } else if (page.caption) {
    const cap = document.createElement('div');
    cap.className = 'kz-page-caption';
    cap.textContent = page.caption;
    el.appendChild(cap);
  }

  page.overlays.forEach((overlay) => {
    const hotspot = document.createElement('button');
    hotspot.type = 'button';
    hotspot.className = 'kz-hotspot';
    hotspot.style.left = `${overlay.x}%`;
    hotspot.style.top = `${overlay.y}%`;
    hotspot.style.width = `${overlay.width}%`;
    hotspot.style.height = `${overlay.height}%`;
    hotspot.style.borderColor = theme.accent;
    hotspot.setAttribute('aria-label', overlay.label || overlay.type);
    hotspot.innerHTML = `<span class="kz-hotspot-icon" style="background:${theme.accent}">${overlayIcon(overlay.type)}</span>`;
    hotspot.addEventListener('click', (e) => {
      e.stopPropagation();
      onOverlayActivate(overlay);
    });
    el.appendChild(hotspot);
  });

  return el;
}

const FlipBook = forwardRef<FlipBookHandle, FlipBookProps>(function FlipBook(
  { pages, theme: themeId, aspectRatio, pageMode, soundEnabled, onOverlayActivate, onFlip },
  ref,
) {
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bookHostRef = useRef<HTMLDivElement | null>(null);
  const pageFlipRef = useRef<PageFlipInstance | null>(null);
  const pageElsRef = useRef<HTMLElement[]>([]);
  const soundEnabledRef = useRef(soundEnabled);
  const onOverlayActivateRef = useRef(onOverlayActivate);
  const onFlipRef = useRef(onFlip);
  const [indicator, setIndicator] = useState({ index: 0, count: pages.length });
  const [ready, setReady] = useState(false);
  const currentIndexRef = useRef(0);

  soundEnabledRef.current = soundEnabled;
  onOverlayActivateRef.current = onOverlayActivate;
  onFlipRef.current = onFlip;

  useImperativeHandle(ref, () => ({
    next: () => pageFlipRef.current?.flipNext(),
    prev: () => pageFlipRef.current?.flipPrev(),
    goTo: (index: number) => pageFlipRef.current?.flip(index),
  }));

  useEffect(() => {
    let disposed = false;

    const theme = getTheme(themeId);
    const { w: ratioW, h: ratioH } = aspectRatioToWH(aspectRatio);
    const pageAspect = ratioW / ratioH;

    // ---- Sizing strategy ---------------------------------------------
    // Uses StPageFlip's own "stretch" sizing, which reads the container's
    // live size on every internal resize tick — we never destroy/rebuild
    // the instance for a plain window resize. A manually-computed "fixed"
    // pixel size plus a destroy-and-rebuild-on-resize loop (the previous
    // approach here) fights the library's own internal resize listener:
    // PageFlip.destroy() never actually cancels its requestAnimationFrame
    // render loop, only removes the DOM node, so a resize storm (e.g. a
    // mobile browser's address bar showing/hiding) can leave two
    // instances repositioning the same shared page elements at once.
    // We only rebuild on an explicit mode change or new page set.
    const maxHeight = 760;
    const maxWidth = 620;
    const minHeight = 260;
    // minWidth also becomes a literal CSS min-width StPageFlip applies to
    // the book element (×1 for portrait, ×2 for landscape) — not purely an
    // internal threshold, so this is deliberately a moderate value per
    // mode rather than an arbitrarily large "always force single" one,
    // which would blow the element past the viewport.
    const minWidth = pageMode === 'single' ? 340 : pageMode === 'auto' ? 380 : 220;

    async function build(startPage: number) {
      const { PageFlip } = await import('page-flip');
      if (disposed) return;
      if (!bookHostRef.current) return;

      const pf = new PageFlip(bookHostRef.current, {
        width: Math.round(pageAspect * maxHeight),
        height: maxHeight,
        size: 'stretch' as unknown as SizeType,
        autoSize: true,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        showCover: true,
        usePortrait: pageMode !== 'double',
        maxShadowOpacity: 0.6,
        flippingTime: 700,
        mobileScrollSupport: true,
        swipeDistance: 25,
        startPage: Math.min(startPage, pages.length - 1),
      });

      pf.loadFromHTML(pageElsRef.current);
      pf.on('flip', () => {
        if (soundEnabledRef.current) playPageTurnSound();
        const idx = pf.getCurrentPageIndex();
        const count = pf.getPageCount();
        currentIndexRef.current = idx;
        setIndicator({ index: idx, count });
        onFlipRef.current?.(idx, count);
      });

      pageFlipRef.current = pf;
      const idx = pf.getCurrentPageIndex();
      const count = pf.getPageCount();
      currentIndexRef.current = idx;
      setIndicator({ index: idx, count });
      onFlipRef.current?.(idx, count);
      setReady(true);
    }

    const stage = stageRef.current;
    if (stage && !bookHostRef.current) {
      const host = document.createElement('div');
      host.className = 'kz-book';
      stage.appendChild(host);
      bookHostRef.current = host;
    }

    pageElsRef.current = pages.map((p) => buildPageElement(p, theme, (o) => onOverlayActivateRef.current(o)));
    build(currentIndexRef.current);

    function onFullscreenChange() {
      // Fullscreen toggles can change the container's size abruptly enough
      // that a nudge helps; StPageFlip's own resize listener handles the
      // ordinary case, this is just a safety net for that one transition.
      setTimeout(() => pageFlipRef.current?.update(), 60);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      disposed = true;
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch {
          /* no-op */
        }
        pageFlipRef.current = null;
      }
      bookHostRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, themeId, aspectRatio, pageMode]);

  return (
    <div className="kz-stage-wrapper" ref={stageWrapperRef}>
      <div className="kz-stage" ref={stageRef} />
      {!ready && <div className="kz-loading">Loading album…</div>}
      <div className="sr-only" aria-live="polite">
        Page {indicator.index + 1} of {indicator.count}
      </div>
    </div>
  );
});

export default FlipBook;
