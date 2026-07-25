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

const BASE_PAGE_HEIGHT = 720;

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
  const bookRef = useRef<HTMLDivElement | null>(null);
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
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout>;

    const theme = getTheme(themeId);
    const { w: ratioW, h: ratioH } = aspectRatioToWH(aspectRatio);
    const basePageHeight = BASE_PAGE_HEIGHT;
    const basePageWidth = Math.round((basePageHeight * ratioW) / ratioH);

    function effectiveMode(containerWidth: number): 'single' | 'double' {
      if (pageMode === 'double') return 'double';
      if (pageMode === 'single') return 'single';
      return containerWidth >= 760 ? 'double' : 'single';
    }

    function computeSize(mode: 'single' | 'double') {
      const wrapper = stageWrapperRef.current;
      if (!wrapper) return { pageW: basePageWidth, pageH: basePageHeight };
      const rect = wrapper.getBoundingClientRect();
      const availW = Math.max(220, rect.width - 24);
      const availH = Math.max(220, rect.height - 24);
      const factor = mode === 'double' ? 2 : 1;
      const aspect = basePageWidth / basePageHeight;

      let pageW = availW / factor;
      let pageH = pageW / aspect;
      if (pageH > availH) {
        pageH = availH;
        pageW = pageH * aspect;
      }
      pageW = Math.min(pageW, 620);
      pageH = Math.min(pageH, 860);
      return { pageW: Math.round(pageW), pageH: Math.round(pageH) };
    }

    async function build(startPage: number) {
      const { PageFlip } = await import('page-flip');
      if (disposed) return;
      const stage = stageRef.current;
      if (!stage) return;

      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch {
          /* no-op */
        }
        pageFlipRef.current = null;
      }

      const newBook = document.createElement('div');
      newBook.className = 'kz-book';
      pageElsRef.current.forEach((el) => newBook.appendChild(el));
      stage.innerHTML = '';
      stage.appendChild(newBook);
      bookRef.current = newBook;

      const wrapper = stageWrapperRef.current;
      const containerWidth = wrapper ? wrapper.getBoundingClientRect().width : basePageWidth * 2;
      const mode = effectiveMode(containerWidth);
      const { pageW, pageH } = computeSize(mode);
      const totalW = pageW * (mode === 'double' ? 2 : 1);

      stage.style.width = `${totalW}px`;
      stage.style.height = `${pageH}px`;
      newBook.style.width = `${totalW}px`;
      newBook.style.height = `${pageH}px`;

      const pf = new PageFlip(newBook, {
        width: pageW,
        height: pageH,
        size: 'fixed' as unknown as SizeType,
        autoSize: false,
        showCover: true,
        usePortrait: mode === 'single',
        maxShadowOpacity: 0.6,
        flippingTime: 620,
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

    pageElsRef.current = pages.map((p) => buildPageElement(p, theme, (o) => onOverlayActivateRef.current(o)));
    build(currentIndexRef.current);

    function scheduleRebuild() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build(currentIndexRef.current);
      }, 150);
    }

    if (typeof ResizeObserver !== 'undefined' && stageWrapperRef.current) {
      resizeObserver = new ResizeObserver(scheduleRebuild);
      resizeObserver.observe(stageWrapperRef.current);
    }
    window.addEventListener('orientationchange', scheduleRebuild);

    return () => {
      disposed = true;
      clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      window.removeEventListener('orientationchange', scheduleRebuild);
      if (pageFlipRef.current) {
        try {
          pageFlipRef.current.destroy();
        } catch {
          /* no-op */
        }
        pageFlipRef.current = null;
      }
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
