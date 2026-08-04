"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageFlip } from "page-flip";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Search,
  Grid2x2,
  Download,
  Printer,
  Share2,
  Play,
  Pause,
  X,
} from "lucide-react";
import { playFlipSound } from "@/lib/flipSound";
import { useViewerAnalytics } from "@/lib/useViewerAnalytics";
import { ZoomOverlay } from "./ZoomOverlay";

export interface ViewerHotspot {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  url: string | null;
  caption: string | null;
}

export interface ViewerPage {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  thumbUrl: string;
  lowUrl: string;
  highUrl: string;
  text: string | null;
  hotspots: ViewerHotspot[];
}

export interface ViewerFlipbook {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  pageCount: number | null;
  defaultViewMode: "SINGLE" | "DOUBLE" | "AUTO";
  rtl: boolean;
  flipSound: boolean;
  autoFlipEnabled: boolean;
  autoFlipSeconds: number;
  showToc: boolean;
  showThumbnails: boolean;
  showDownloadBtn: boolean;
  showShareBtn: boolean;
  showPrintBtn: boolean;
  allowDownload: boolean;
  allowSearch: boolean;
  allowZoom: boolean;
  backgroundStyle: string;
  backgroundColor: string | null;
  accentColor: string;
  hardCovers: boolean;
  embedAllowed: boolean;
}

const BACKGROUND_CSS: Record<string, string> = {
  charcoal:
    "radial-gradient(ellipse at 50% -10%, rgba(185,141,74,0.12), transparent 55%), #171512",
  linen: "linear-gradient(160deg, #e9e2d3, #cbbfa2)",
  midnight: "radial-gradient(ellipse at 50% -10%, rgba(90,130,220,0.18), transparent 55%), #0c1220",
  forest: "radial-gradient(ellipse at 50% -10%, rgba(90,180,120,0.15), transparent 55%), #0e1a13",
  "plain-white": "#f2f2f0",
};

export function FlipbookViewer({
  flipbook,
  pages,
  embed,
}: {
  flipbook: ViewerFlipbook;
  pages: ViewerPage[];
  embed: boolean;
}) {
  const bookHostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const pageElsRef = useRef<HTMLElement[]>([]);
  const loadedHighRef = useRef<Set<number>>(new Set());
  const maxPageRef = useRef(0);

  const [mode, setMode] = useState<"SINGLE" | "DOUBLE" | "AUTO">(flipbook.defaultViewMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(flipbook.flipSound);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [autoPlaying, setAutoPlaying] = useState(flipbook.autoFlipEnabled);
  const [ready, setReady] = useState(false);

  useViewerAnalytics(flipbook.slug, maxPageRef);

  const pageAspect = pages[0] ? pages[0].width / pages[0].height : 0.72;

  // ---- Build the source elements StPageFlip reads via loadFromHTML -------
  useEffect(() => {
    pageElsRef.current = pages.map((p, i) => {
      const el = document.createElement("div");
      el.className = "flip-page";
      const isCover = flipbook.hardCovers && (i === 0 || i === pages.length - 1);
      if (isCover) el.dataset.density = "hard";

      const img = document.createElement("img");
      img.src = p.lowUrl;
      img.draggable = false;
      img.dataset.pageNumber = String(p.pageNumber);
      el.appendChild(img);

      for (const h of p.hotspots) {
        if (h.type !== "LINK" || !h.url) continue;
        const a = document.createElement("a");
        a.href = h.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.title = h.caption ?? "";
        a.style.position = "absolute";
        a.style.left = `${h.x * 100}%`;
        a.style.top = `${h.y * 100}%`;
        a.style.width = `${h.width * 100}%`;
        a.style.height = `${h.height * 100}%`;
        a.style.background = "rgba(185,141,74,0.15)";
        a.style.border = "1px dashed rgba(185,141,74,0.6)";
        a.style.borderRadius = "4px";
        el.appendChild(a);
      }

      return el;
    });
    loadedHighRef.current = new Set();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  function upgradeToHigh(pageIndex: number) {
    const el = pageElsRef.current[pageIndex];
    const page = pages[pageIndex];
    if (!el || !page || loadedHighRef.current.has(pageIndex)) return;
    const img = el.querySelector("img");
    if (img) img.src = page.highUrl;
    loadedHighRef.current.add(pageIndex);
  }

  // ---- StPageFlip sizing --------------------------------------------------
  // Previous approach computed a fixed pixel size ourselves and destroyed +
  // rebuilt the whole PageFlip instance on every window "resize" event. That
  // fights the library's OWN internal resize listener (it registers one too,
  // see StPageFlip's UI.ts), and PageFlip.destroy() never actually cancels
  // its requestAnimationFrame render loop — only removes the DOM node. Two
  // instances (or an old, destroyed-but-still-animating one) end up
  // repositioning the *same* shared page elements at once, which is exactly
  // the overlapping "ghost page" corruption seen on mobile, where the
  // address bar showing/hiding fires resize events constantly.
  //
  // The fix: use StPageFlip's own "stretch" sizing mode, which reads the
  // container's live size on every internal resize tick without us ever
  // touching destroy/rebuild for a plain resize. We only rebuild when the
  // user explicitly changes the single/double/auto mode (rare, deliberate),
  // and per-mode behavior is expressed via minWidth/usePortrait rather than
  // a manually recomputed pixel size:
  //  - AUTO:   usePortrait true, normal breakpoint -> switches to a single
  //            page once the container gets too narrow for a spread.
  //  - SINGLE: usePortrait true, with an unreachably large minWidth so the
  //            portrait (single-page) branch is always taken.
  //  - DOUBLE: usePortrait false, so it never drops to single page.
  function buildFlip(startPage: number) {
    if (!bookHostRef.current || pageElsRef.current.length === 0) return;

    if (pageFlipRef.current) {
      try {
        pageFlipRef.current.destroy();
      } catch {
        /* no-op */
      }
      // Defensive: destroy() should already remove this node, but don't
      // leave a stale copy in the live DOM if it threw partway through.
      if (bookHostRef.current.parentNode) {
        bookHostRef.current.parentNode.removeChild(bookHostRef.current);
      }
      const fresh = document.createElement("div");
      fresh.id = "kzn-book";
      pageElsRef.current.forEach((el) => fresh.appendChild(el));
      stageRef.current?.appendChild(fresh);
      bookHostRef.current = fresh;
    }

    // NOTE: minWidth doubles as a *literal* CSS min-width StPageFlip applies
    // to the book element (scaled ×1 for portrait, ×2 for landscape) — not
    // purely an internal threshold. Do not set this to an arbitrarily large
    // "always true" value to force single-page mode: it becomes a real
    // `min-width` in pixels on the DOM element, blowing it up far past the
    // viewport and stealing clicks from everything underneath it. Keep it
    // at a sane single/spread page width instead.
    const minWidth = mode === "SINGLE" ? 340 : mode === "AUTO" ? 380 : 220;
    const maxWidth = 560;
    const minHeight = 240;
    const maxHeight = 860;

    const pageFlip = new PageFlip(bookHostRef.current, {
      width: Math.round(pageAspect * maxHeight),
      height: maxHeight,
      size: "stretch",
      autoSize: true,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
      showCover: flipbook.hardCovers,
      usePortrait: mode !== "DOUBLE",
      maxShadowOpacity: 0.6,
      flippingTime: 850,
      mobileScrollSupport: true,
      swipeDistance: 25,
      disableFlipByClick: false,
      startPage: startPage || 0,
    });

    pageFlip.loadFromHTML(pageElsRef.current);
    pageFlip.on("flip", (e) => {
      const idx = e.data as number;
      setCurrentIndex(idx);
      maxPageRef.current = Math.max(maxPageRef.current, idx + 1);
      upgradeToHigh(idx);
      upgradeToHigh(idx + 1);
      upgradeToHigh(idx - 1);
      if (soundOn) playFlipSound();
    });
    pageFlip.on("init", () => setReady(true));

    pageFlipRef.current = pageFlip;
    upgradeToHigh(startPage);
    upgradeToHigh(startPage + 1);
  }

  // Rebuilds only on mount and on an explicit mode change — never on window
  // resize/orientation/fullscreen, which "stretch" sizing already handles
  // internally via StPageFlip's own resize listener.
  useEffect(() => {
    if (pageElsRef.current.length === 0) return;
    buildFlip(pageFlipRef.current?.getCurrentPageIndex() ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pages]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!pageFlipRef.current) return;
      const forward = flipbook.rtl ? "ArrowLeft" : "ArrowRight";
      const backward = flipbook.rtl ? "ArrowRight" : "ArrowLeft";
      if (e.key === forward) goNext();
      if (e.key === backward) goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
      // Safe, non-destructive: just asks StPageFlip to recompute its layout
      // for the new viewport, unlike the old rebuild-on-fullscreen-change.
      setTimeout(() => pageFlipRef.current?.update(), 60);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!autoPlaying) return;
    const interval = setInterval(() => {
      goNext();
    }, flipbook.autoFlipSeconds * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlaying, flipbook.autoFlipSeconds]);

  function goNext() {
    if (flipbook.rtl) pageFlipRef.current?.flipPrev();
    else pageFlipRef.current?.flipNext();
  }
  function goPrev() {
    if (flipbook.rtl) pageFlipRef.current?.flipNext();
    else pageFlipRef.current?.flipPrev();
  }
  function jumpTo(index: number) {
    pageFlipRef.current?.turnToPage(index);
    setAutoPlaying(false);
    setTocOpen(false);
    setSearchOpen(false);
  }

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return pages
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.text?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [searchQuery, pages]);

  const shareUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
  const isLast = currentIndex >= pages.length - 1;
  const isFirst = currentIndex <= 0;

  return (
    <div
      ref={mainRef}
      className={`flex flex-col ${embed ? "h-full" : "min-h-screen"} text-[#ece7de]`}
      style={{
        background: flipbook.backgroundColor || BACKGROUND_CSS[flipbook.backgroundStyle] || BACKGROUND_CSS.charcoal,
        ["--accent" as string]: flipbook.accentColor,
      }}
    >
      {!embed && (
        <header className="flex items-center justify-between px-5 py-4">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="font-display text-lg truncate">{flipbook.title}</h1>
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-muted shrink-0">
            {ready ? `${currentIndex + 1} / ${pages.length}` : "Loading…"}
          </span>
        </header>
      )}

      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-0">
        <div ref={stageWrapperRef} className="flex flex-1 w-full items-center justify-center min-h-0">
          <div ref={stageRef} className="relative h-full w-full max-w-full flex items-center justify-center">
            <div ref={bookHostRef} id="kzn-book" className="relative h-full" />
          </div>
        </div>

        {flipbook.allowZoom && ready && (
          <button
            onClick={() => setZoomSrc(pages[currentIndex]?.highUrl ?? null)}
            className="absolute bottom-24 right-6 rounded-full bg-black/40 p-2.5 text-white hover:bg-black/60 transition-colors"
            aria-label="Zoom"
          >
            <Search size={16} />
          </button>
        )}

        {/* Corner nav arrows */}
        {ready && !isFirst && (
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {ready && !isLast && (
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 px-4 pb-4 pb-[env(safe-area-inset-bottom,0px)] flex-wrap">
        <ToolbarButton active={mode === "AUTO"} onClick={() => setMode("AUTO")} label="Auto page layout" wide>
          Auto
        </ToolbarButton>
        <ToolbarButton active={mode === "SINGLE"} onClick={() => setMode("SINGLE")} label="Single page" small>
          1
        </ToolbarButton>
        <ToolbarButton active={mode === "DOUBLE"} onClick={() => setMode("DOUBLE")} label="Double page" small>
          2
        </ToolbarButton>
        <Divider />
        {flipbook.showToc && (
          <ToolbarButton onClick={() => setTocOpen((v) => !v)} label="Thumbnails" active={tocOpen}>
            <Grid2x2 size={16} />
          </ToolbarButton>
        )}
        {flipbook.allowSearch && (
          <ToolbarButton onClick={() => setSearchOpen((v) => !v)} label="Search" active={searchOpen}>
            <Search size={16} />
          </ToolbarButton>
        )}
        <ToolbarButton onClick={() => setSoundOn((v) => !v)} label="Flip sound">
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </ToolbarButton>
        {flipbook.autoFlipEnabled !== undefined && (
          <ToolbarButton onClick={() => setAutoPlaying((v) => !v)} label="Autoplay" active={autoPlaying}>
            {autoPlaying ? <Pause size={16} /> : <Play size={16} />}
          </ToolbarButton>
        )}
        <ToolbarButton
          onClick={() => {
            if (!document.fullscreenElement) mainRef.current?.requestFullscreen?.().catch(() => {});
            else document.exitFullscreen?.();
          }}
          label="Fullscreen"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </ToolbarButton>
        {flipbook.showShareBtn && (
          <ToolbarButton onClick={() => setShareOpen((v) => !v)} label="Share" active={shareOpen}>
            <Share2 size={16} />
          </ToolbarButton>
        )}
        {flipbook.showPrintBtn && (
          <ToolbarButton onClick={() => openPrintView(pages)} label="Print">
            <Printer size={16} />
          </ToolbarButton>
        )}
        {flipbook.showDownloadBtn && flipbook.allowDownload && (
          <a
            href={`/api/flipbooks/${flipbook.id}/download`}
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs hover:border-accent hover:text-accent transition-colors"
          >
            <Download size={16} /> PDF
          </a>
        )}
      </div>

      {tocOpen && (
        <Drawer onClose={() => setTocOpen(false)} title="Pages">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => jumpTo(i)}
                className={`rounded-lg overflow-hidden border ${
                  i === currentIndex ? "border-accent" : "border-white/10"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbUrl} alt={`Page ${p.pageNumber}`} className="w-full" />
                <span className="block text-[10px] py-1 text-muted">{p.pageNumber}</span>
              </button>
            ))}
          </div>
        </Drawer>
      )}

      {searchOpen && (
        <Drawer onClose={() => setSearchOpen(false)} title="Search inside">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a word or phrase…"
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            {searchResults.map(({ p, i }) => (
              <button
                key={p.id}
                onClick={() => jumpTo(i)}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5"
              >
                <span className="text-accent">Page {p.pageNumber}</span>{" "}
                <span className="text-muted">{snippetAround(p.text ?? "", searchQuery)}</span>
              </button>
            ))}
            {searchQuery && searchResults.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted">No matches.</p>
            )}
          </div>
        </Drawer>
      )}

      {shareOpen && (
        <Drawer onClose={() => setShareOpen(false)} title="Share">
          <div className="flex flex-wrap gap-2">
            <ShareLink href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}>WhatsApp</ShareLink>
            <ShareLink href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`}>X</ShareLink>
            <ShareLink href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}>
              Facebook
            </ShareLink>
            <ShareLink href={`mailto:?body=${encodeURIComponent(shareUrl)}`}>Email</ShareLink>
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-accent transition-colors"
            >
              Copy link
            </button>
          </div>
        </Drawer>
      )}

      {zoomSrc && <ZoomOverlay src={zoomSrc} onClose={() => setZoomSrc(null)} />}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  label,
  small,
  wide,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
  small?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-full border transition-colors ${
        wide ? "h-8 px-3 text-xs" : small ? "h-8 w-8 text-xs" : "h-9 w-9"
      } ${active ? "border-accent text-accent bg-accent/10" : "border-white/15 text-white/70 hover:border-accent hover:text-accent"}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-white/10" />;
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

function ShareLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-accent transition-colors"
    >
      {children}
    </a>
  );
}

function snippetAround(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 60);
  const start = Math.max(0, idx - 20);
  return `…${text.slice(start, idx + query.length + 20)}…`;
}

function openPrintView(pages: ViewerPage[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const imgs = pages
    .map((p) => `<img src="${p.highUrl}" style="width:100%;display:block;page-break-after:always;" />`)
    .join("");
  win.document.write(`<!DOCTYPE html><html><head><title>Print</title></head><body style="margin:0">${imgs}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
