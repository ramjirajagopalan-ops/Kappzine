# Curl engine demo — status

Standalone canvas page-turn engine, not yet wired into `src/components/viewer/FlipbookViewer.tsx`.
Open `flip-curl-demo.html` directly in a browser to try it (or see the live copy on the
Artifact link shared in chat).

## Working (verified against Heyzine reference video/screenshots)
- Fold leans with vertical drag like a real page, but is clamped to a max
  ~75° lean off the pull-to-spine direction so it can't rotate past the
  spine or invert (fixed 2026-08-03 — "turn only from the right and till
  the middle binding").
- Full-height fold band for straight-across drags; naturally tapers to a
  narrow corner peel for small/leaning drags instead of always forcing full
  height (fixed 2026-08-03 — the flap's shading was filling the full canvas
  height regardless of lean angle, which made a leaning drag balloon into a
  flat parallelogram eating half the page instead of a believable tapered
  curl. Now the flap is the true reflection of whatever part of the page
  rectangle lies beyond the fold line, computed via half-plane polygon clip
  in the fold's local frame — this taper naturally disappears and reaches
  full height on its own once a drag is close to straight-across).
- Edge-only drag initiation — grabbing the middle of the page does nothing.
- Next page reveals progressively during the drag (fixed 2026-08-02: the
  "still flat" clip region was on the wrong side of the fold line, covering
  exactly the space the next page needed to show through).
- Flap length is half the anchor-to-pointer distance, not the full distance
  (fixed 2026-08-03 — a real mirror fold's crease sits at the midpoint
  between the grabbed corner and where it's dragged to; using the full
  distance made the flap balloon to double size and swallow the whole page
  well before the drag was anywhere near complete).
- Curl shading is one continuous gradient (white crease → mid grey-tan
  shadow → bright tip rim), not several overlapping semi-transparent
  rectangles — that approach left visible hard seams between bands (fixed
  2026-08-03, side-by-side against a Heyzine screenshot). Cast shadows onto
  the surfaces around the flap are now soft/blurred and drawn before the
  flap's own clip is applied, instead of being hard-cut to the flap's
  tapered silhouette (which is what made our shadow look like a sharp
  cutout instead of Heyzine's soft, diffuse falloff). This also fixed a
  bug from the taper change where the crease-side shadow was being clipped
  away almost entirely.
- Debug-colored pages (`DEBUG_COLORS` in the file) so it's obvious at a glance
  whether the right page is showing through.
- White background.

## Still open
- Shadow/curl look — much closer to the Heyzine reference now but not yet
  pixel-matched; keep comparing against reference screenshots.
- Double-page spread mode (cover → 2-page spread like a real open magazine,
  e.g. page 1 back = page 2, shown side-by-side with page 3) — requested by
  the user, more detail incoming before starting this.
- Not yet ported into `FlipbookViewer.tsx` (production StPageFlip-based
  viewer) — that's a separate, bigger integration touching double-page mode,
  hotspots, zoom, and sound. Don't start until the demo's feel is confirmed.
- Once debug colors are no longer needed, swap back in `magazinePage()` /
  `coverArt()` (already written in the file, currently unused) for realistic
  page content.
