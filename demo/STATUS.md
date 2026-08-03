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
- Shadow is now cast by filling the flap's own polygon path with the
  canvas's native shadowColor/shadowBlur, instead of hand-computed shadow
  bands (fixed 2026-08-03, second pass — the first attempt bounded the
  bands to the flap's Y-extent but they could still drift out of
  alignment with the real tapered shape; filling the SAME polygon that's
  used for the flap itself makes misalignment geometrically impossible).
  This also surfaced and fixed a related bug: the paper gradient fill only
  covered `0` to `-half`, but flapLocal's real extent (derived from the
  page rectangle's corners) isn't bounded by `half` — so part of the
  polygon could go unpainted by the paper fill and expose the opaque
  shadow-casting fill underneath as a stray solid black wedge. The paper
  fill now reaches flapLocal's actual extent.
- Debug-colored pages (`DEBUG_COLORS` in the file) so it's obvious at a glance
  whether the right page is showing through.
- White background.

- Curl paper is flat white everywhere except a narrow "roll" band hugging
  the crease line itself (fixed 2026-08-03, per a user-annotated
  screenshot circling the exact region on both Heyzine's and our curl —
  it was the crease line, not the whole flap). Real paper only visibly
  bends right at the fold; the rest of the flap, further toward the tip,
  is flat. An earlier attempt spread the shading across the entire flap
  (crease to tip), which is why it never quite matched — Heyzine's flap is
  flat white except right at the bend.

- Drag reach is now 1:1 with pointer travel, not 1:2 (fixed 2026-08-03,
  from a screen recording showing the fold "won't curl more than half"
  compared to Heyzine). Root cause: the crease sat at the MIDPOINT between
  the anchor and the pointer (the textbook-correct flat mirror-fold
  reflection point), so dragging a full page-width only ever moved the
  visible fold to the halfway point, and reaching the spine required
  dragging TWICE the page width — more than the code's own max-drag clamp
  allowed, making full closure through dragging alone mathematically
  impossible. The crease now sits directly at the pointer's distance from
  the anchor; the taper clip (already in place) still bounds the flap to
  the real page rectangle, so this doesn't reintroduce the earlier
  "swallows the whole page" bug.

- Release/commit threshold now compares how much of the page is visibly
  folded (`lastReach`, set on every render) against half the page width,
  instead of comparing raw drag distance against the page's full
  diagonal (fixed 2026-08-03, from a screen recording — releasing at a
  visual ~50% fold was springing back instead of completing).
- Cursor is a plain arrow (`cursor: default`) instead of the grab/grabbing
  hand icon, matching Heyzine (fixed 2026-08-03).
- Hovering near a turnable edge (without pressing down) now eases in a
  small "you can turn this page" corner-curl hint, matching Heyzine
  (added 2026-08-03). Implementation note: the hint is anchored at the
  exact page corner with a 45° lean back into the page
  (`n = {x: dir*SQRT1_2, y: -SQRT1_2}`) — this specific pairing keeps the
  fold line's pivot just inside the page so the reflected "beyond the
  fold" region stays a small corner nibble. A shallower lean, or an
  anchor off the exact corner, pushes the pivot outside the canvas and
  the reflected region balloons to include most of the page (hit this
  exact bug once already — see git history if it needs touching again).

## Still open
Nothing outstanding — engine confirmed matching Heyzine's behavior and
feel as of 2026-08-03. Next step (deferred, needs explicit go-ahead): port
this into `FlipbookViewer.tsx`, replacing StPageFlip.
- Double-page spread mode (cover → 2-page spread like a real open magazine,
  e.g. page 1 back = page 2, shown side-by-side with page 3) — requested by
  the user, more detail incoming before starting this.
- Once debug colors are no longer needed, swap back in `magazinePage()` /
  `coverArt()` (already written in the file, currently unused) for realistic
  page content.
