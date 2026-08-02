# Curl engine demo — status

Standalone canvas page-turn engine, not yet wired into `src/components/viewer/FlipbookViewer.tsx`.
Open `flip-curl-demo.html` directly in a browser to try it (or see the live copy on the
Artifact link shared in chat).

## Working (verified against Heyzine reference video/screenshots)
- Free-directional drag: fold leans wherever the pointer actually goes, not locked to 45°.
- Full-height fold band — spans the whole page, no triangular corner taper.
- Edge-only drag initiation — grabbing the middle of the page does nothing.
- Next page reveals progressively during the drag (fixed 2026-08-02: the
  "still flat" clip region was on the wrong side of the fold line, covering
  exactly the space the next page needed to show through).
- Debug-colored pages (`DEBUG_COLORS` in the file) so it's obvious at a glance
  whether the right page is showing through.
- White background.

## Still open
- Shadow quality at the fold crease — functional but not yet confirmed as a
  match for Heyzine's "nice feel" by eye against the reference.
- Not yet ported into `FlipbookViewer.tsx` (production StPageFlip-based
  viewer) — that's a separate, bigger integration touching double-page mode,
  hotspots, zoom, and sound. Don't start until the demo's feel is confirmed.
- Once debug colors are no longer needed, swap back in `magazinePage()` /
  `coverArt()` (already written in the file, currently unused) for realistic
  page content.
