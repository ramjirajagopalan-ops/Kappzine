# Curl engine demo — status

Standalone canvas page-turn engine, not yet wired into `src/components/viewer/FlipbookViewer.tsx`.
Open `flip-curl-demo.html` directly in a browser to try it (or see the live copy on the
Artifact link shared in chat).

## Alternative under evaluation: StPageFlip (2026-08-03)

After 12 rounds tuning the custom canvas engine's cover<->spread transition
without a confirmed match to Heyzine, and given the user's stated priority
(freeze the curl fast, then move to dashboard/feature work), built
`stpageflip-demo.html` — the SAME 6-page mock book rendered with `page-flip`
(StPageFlip), the open-source, self-hosted library **already used** in
production `FlipbookViewer.tsx` (same config: stretch sizing, 700ms flip,
0.6 max shadow opacity, showCover). Explicitly NOT Heyzine's own API — no
vendor lock-in, no upload dependency on a third party.

Notable, honest differences observed vs. the custom engine (not yet compared
against Heyzine frame-by-frame — that's the next step, pending user review):
- Real CSS 3D perspective transforms (the page visibly foreshortens/skews in
  3D), not a flat mirror-reflection — a different *style* of fold than our
  hand-rolled geometry, worth comparing directly against Heyzine's own look.
  See `stpf_drag_055.png` in the session's scratchpad for a mid-drag capture.
  Interior spread-to-spread and the cover flip both work via drag and via
  the 1/2/A mode buttons out of the box, no custom rectOpts/lean math needed.
  Also worth noting: the demo's own `dependencies` list currently pins
  `page-flip@2.0.7` in `package.json` — same version bundled here.
- The cover renders RIGHT-aligned within its stage at rest by default
  (`showCover:true` + stretch sizing), not centered — unlike the explicit
  "cover always centered" requirement called out for the custom engine.
  Whether this is fixable via config/CSS (vs. requiring a fork) is unverified.

Decision pending: user is reviewing this demo before deciding whether to keep
tuning the custom canvas engine, switch to configuring/skinning StPageFlip to
match Heyzine, or some hybrid. Do not assume either direction — ask/check
before continuing further curl work in either file.

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

- Completion animation is smooth (no dead tail), and hover hint appears
  at bottom corners too, not just top (fixed 2026-08-03, third pass from
  a screen recording). Root causes:
  - The completion animation targeted the page's full diagonal even
    after the earlier "1.15x" tightening — the flap's visible reach
    doesn't scale with an arbitrary constant at all, so most drags
    still hit their real visual close point well before the animation's
    target, producing a fast snap then a long dead pause. Replaced with
    `fullCloseD(anchor, n)`: an exact, non-iterative formula (max over
    the 4 page corners of `(anchor-corner)·n`) giving the precise `d` at
    which every corner has crossed the fold line and the front page is
    fully hidden — no more, no less, for whatever the current anchor/lean
    actually is. `animateD` now also takes an explicit `commit` boolean
    instead of inferring "did we reach the far end" by comparing the
    target to a constant, which broke once the target became per-drag.
  - Along the way, an interim attempt at the above (searching for where
    a computed "reach" plateaus) had a subtle bug: once the fold's pivot
    point moves outside the canvas (which happens well before visual
    closure for a straight drag), that reach calculation keeps climbing
    with `d` even though nothing more is visible, so the search never
    found a genuine plateau. Replaced with the exact corner-crossing
    formula above, which has no such blind spot.
  - Fixing the snap condition then surfaced a real regression: the new
    per-drag check ran even at total idle (d=0) using the default,
    never-yet-set anchor/direction, which can degenerately evaluate as
    "already closed" and snap straight to the next page on page load —
    caught by the regression suite (center-click-does-nothing test
    started failing). Fixed by gating the whole check on `d > 0.5` first.
  - Hover hint: added a `hoverCorner` (top/bottom) alongside the existing
    `hoverDir` (left/right), chosen by which half of the page height the
    pointer is actually in, mirroring the same corner-anchor trick
    vertically for the bottom case.
  - Also slowed the animation durations (260/220ms → 440/320ms) and the
    hover ease rate, per direct user feedback that the motion felt too
    fast/abrupt even after the dead-tail fix.

- Clicking no longer produces an unrequested curl, and dragging mostly
  vertically no longer swings the fold to a steep, "wrong direction"
  diagonal (fixed 2026-08-03, fourth pass, from two screen recordings).
  Two distinct root causes:
  - The phantom click-curl: `anchorPoint` (the fold's geometric anchor)
    snaps to the exact page edge, but the edge-zone margin that allows
    starting a drag is generous (~100px), so an ordinary click can land
    well inside the true edge. Measuring drag distance from anchorPoint
    (as every earlier version did) turned that click-to-edge gap alone
    into phantom drag distance — a real curl appearing the instant you
    clicked, before any actual movement. Fixed by adding `dragStart`
    (the point the pointer actually went down at, distinct from
    anchorPoint) and measuring both reach and lean direction from that
    instead — genuinely zero at the moment of a click, growing only with
    real subsequent movement. A small 6px dead zone on top absorbs
    ordinary hand tremor on the press itself.
  - Direction fidelity: MAX_LEAN was 75°, so a mostly-vertical drag
    produced a steep near-diagonal slice that read as "wrong direction"
    rather than a page turning on its spine, where Heyzine's own fold
    stays close to a natural, straight-across turn even when dragged
    erratically. Tightened to 28° so the lean reads as a flourish, not a
    redirect of the turn itself.
  - Fixing the click-curl surfaced a related bug in the release/commit
    decision: `lastReach` (the flap's paint-bounds extent) can vastly
    overshoot the actual drag distance for a steep lean anchored near a
    page corner — the same "polygon corner far from the crease" quirk
    fixed earlier for the animation target, just showing up in a new
    spot. A genuine ~7px jitter was measured at a "lastReach" of 250+,
    which very nearly (wrongly) auto-completed a full page turn from a
    twitch. Fixed by comparing `d` itself against `fullCloseD(anchor, n)
    * 0.5` for the commit decision instead of comparing `lastReach`
    against a fixed page-width fraction — both sides of that comparison
    scale from the same anchor/lean, so it can't be thrown off the same
    way.

- Commit-on-release threshold and the fold's lean angle both fixed again
  (2026-08-03, fifth pass) after a video showed a deliberate ~half-page
  drag still springing back, and the lean still reading as "same as
  before" despite the 28° clamp from the previous pass:
  - Commit threshold: `d > fullCloseD(anchor,n) * 0.5` (the previous
    pass's fix) turned out to have the same class of bug as the
    `lastReach`-based version it replaced — a fold LINE's angle alone can
    split the page very unevenly independent of actual drag distance
    near a corner, so `fullCloseD` for a corner-anchored steep lean can
    be much larger than what "looks half done" (measured: a deliberate,
    visually-more-than-half drag scored only 0.45 on this metric and
    wrongly sprang back). Replaced with the simplest, most robust
    measure available: `d > W * 0.5` directly — after the dragStart fix,
    `d` is already an exact, lean-independent count of pixels dragged,
    which is also plainly what "dragged it about halfway" means.
  - Lean angle: frame-by-frame comparison against Heyzine's own
    reference recording showed the allowed lean isn't one fixed angle
    through a whole drag — small drags right at a corner lean steeply
    (~45° in their reference, a natural dog-ear peel), but the SAME drag
    straightens back toward vertical (~15-20°) as it continues toward
    completion. A single fixed clamp (tried at both 75° and 28°) can't
    reproduce that arc. Replaced with a clamp that itself shrinks as the
    drag progresses toward its own half-page point: `55° - 38° *
    min(1, d/(W*0.5))`, i.e. up to 55° early, narrowing to 17° by
    halfway. Verified directly: a constant 45°-angle drag input now
    produces a fold angle that starts at 45° and narrows to 17° as it
    grows, matching the measured Heyzine pattern.

- Commit threshold lowered to 40% of page width (was 50%), per explicit
  request after confirming the 50% version worked correctly.
- Fold lean removed entirely (2026-08-03, sixth pass) — after two more
  rounds of tuning the lean-angle clamp (fixed 75°/28°, then a clamp that
  itself narrowed 55°→17° as the drag progressed) still read as "the
  wrong direction," the explicit final ask was for the fold to stay
  straight "however we drag." `curN` is now always exactly
  `{x: anchorDir, y: 0}` — full page height, no lean — and reach (`d`) is
  now driven only by the horizontal component of the drag (`vx`), not
  the full 2D pointer distance, so vertical mouse movement no longer
  affects the fold's reach either, not just its angle. Verified: a
  pure-horizontal drag, a steep up-diagonal, and a steep down-diagonal of
  the same horizontal distance now all produce pixel-identical reach;
  vertical-only movement (zero horizontal) produces no curl at all.

- **Reverted "remove lean entirely" (2026-08-03, seventh pass).** The
  sixth-pass change above was wrong and explicitly rejected: *"no it just
  collapsed our earlier works. now even if u click its just straight. see
  the video. just go back to our earlier output better. we need to see
  the page curl right. now wherever u click its just straight. totally
  wrong."* Confirmed via extracted frames from the rejection video that
  a click near the bottom edge produced a full-height straight vertical
  cut with no natural corner-peel curl, regardless of where on the edge
  you grabbed — a genuine regression from the lean-decay behavior, not a
  matter of taste. Reverted `pointermove` back to the exact lean-decay
  model from the fourth pass: drag distance/direction measured via
  `hypot(vx, vy)` from `dragStart` (not just the horizontal component),
  with `MAX_LEAN = (55 - 38 * progress)°` where `progress = d / (W *
  0.5)`, giving a steep ~45° lean for a small corner peel narrowing to
  ~17° as the drag approaches completion. Verified via debug
  instrumentation that a constant 45°-angle drag input now reproduces the
  identical angle progression measured before the regression (45.0° →
  42.8° → 36.2° → 29.6° → 22.9° → 17.0° → 17.0° across increasing drag
  distances), and re-ran the full standing regression suite (phantom
  click-curl, full-height fold, edge-zone no-op, next-page reveal,
  cursor, hover hint, animation smoothness, jitter no-false-commit, 40%
  commit threshold) — all passed.

- **Double-page spread mode added (2026-08-03, eighth pass).** Interior
  pages (never the front/back cover, which always show single like a real
  book) now render as a two-page spread on wide viewports, with three
  explicit modes (1 / 2 / A buttons: single / double / auto — auto spreads
  once the wrapper is wider than 640px). Studied via extracted frames from
  the user's own Heyzine reference recording
  (`6e4b8479-Recording_20260803_173428.mp4`): unlike single-page mode's
  corner-lean, a spread's fold is hinged at the spine and travels straight
  across with no lean at all — confirmed by measuring the reference frames,
  where the fold stays vertical throughout. Implementation notes:
  - The fold's own closure distance is exactly one page's width (`halfW`),
    not the whole spread's — dragging a spread's page across its own width
    fully closes it, mirroring how single-page mode's `fullCloseD` scales
    to that page's own rectangle.
  - The flap shows the ACTUAL upcoming page's artwork (squeezed to its
    current, still-folding width, "unsqueezing" to full size as the fold
    completes) rather than blank paper — this is what the reference video
    shows for a spread (real content legible on the curling leaf), unlike
    single-page mode's blank-paper-plus-highlight flap.
  - Shadow-before-clip ordering bug caught before shipping: an early draft
    clipped the flap's shadow to the flap's own rect, which (per the
    single-page engine's own history) cuts the blur off exactly at the
    flap's edge instead of letting it spill onto the page underneath.
    Fixed by drawing the shadow first, unclipped, then clipping only for
    the image/highlight fill.
  - Page-pairing bug caught via automated full-cycle navigation test:
    stepping backward from the back cover landed on an unpaired,
    off-by-one spread (e.g. pages 4–5 instead of 3–4), because leaving a
    cover isn't symmetric — advancing from the front cover only steps by
    1 (into the first spread's left slot), but retreating from the back
    cover has to step back by 2 (the page just before it is already the
    right half of the previous spread). Fixed with explicit
    `nextIndexFrom`/`prevIndexFrom` helpers instead of a flat ±1/±2 rule,
    and a `flipJump` computed once per gesture so drags and button clicks
    agree. Verified: a full forward-then-backward navigation cycle through
    all 6 debug pages now lands on the correct spread/cover at every step.
  - Verified: manual mode toggles (forcing single or double regardless of
    width) and the auto breakpoint (falls back to single on a narrow/mobile
    viewport) both work; the full pre-existing single-page regression
    suite was re-run afterward and still passes unchanged.

- **Spread mode corrected against a Heyzine-vs-Kappzine side-by-side
  recording (2026-08-03, ninth pass).** The eighth pass's straight,
  non-leaning spine hinge was wrong — user feedback: *"the page curl
  effect is totally bad in ours. it has be that lean effect for sure."*
  A frame-by-frame look at the user's own side-by-side comparison video
  (`e1f2d2cf-Recording_20260803_180338.mp4`) confirmed two separate
  problems:
  - **Sizing**: Heyzine keeps each page the SAME size when it opens from
    a single cover into a two-page spread (the spread just gets roughly
    twice as wide overall) — Kappzine's spread pages were visibly
    smaller, because `resize()` was computing each half's target size as
    "the available width divided by two," halving the per-page budget
    before even checking whether two pages actually fit. Fixed by
    deriving the per-page size the SAME way single mode does (height-
    driven, capped at 460x660) and ONLY shrinking it if two of them
    genuinely can't fit the viewport. Verified: cover and spread now
    render at the identical per-page width for the same viewport.
  - **Curl shape**: a spread's flip leans and tapers exactly like single-
    page mode's corner-peel — it is not a plain straight-across spine
    hinge. Fixed by generalizing `renderCornerCurl` itself (rather than
    keeping a separate straight-fold implementation) to accept an
    explicit page rect, an image-placement offset, and an optional
    `flapTexture` — called with the full canvas and no texture from
    single-page mode (bit-for-bit identical behavior, confirmed by
    re-running the entire pre-existing regression suite unchanged
    afterward) and with the flipping half's own rect + the real upcoming
    page's image from spread mode. `pointermove`'s spread branch now
    reuses the exact single-page lean-decay formula, just scoped to
    `halfW` instead of `W`. `fullCloseD` was similarly generalized into a
    rect-parametrized `fullCloseDRect`, with `fullCloseD` becoming a
    thin full-canvas wrapper around it.
  - Verified: the corner-peel now grows a small tapered triangular
    curl from the grabbed corner and widens into a full diagonal fold
    exactly like single-page mode, with the real next-page artwork
    visible on the flap (matching the reference video); the full
    single-page regression suite, the spread navigation/boundary tests,
    and the responsive mode-toggle tests were all re-run and still pass.

- **Fixed the "sudden pop" on spread completion, and an upside-down flap
  bug (2026-08-03, tenth pass).** Sizing and lean were confirmed good,
  but user feedback on a fresh Kappzine-only recording
  (`66a633ba-Recording_20260803_182155.mp4`) called out that "we are
  flipping the page, and suddenly 3 and 4 appear, not smooth" — expecting
  the outgoing page to visibly slide/fold away rather than jump.
  Root cause, found by extracting frames around the exact commit moment:
  `renderSpread`'s "fully closed" shortcut drew the flap's texture at
  `rect.imgOffX` — the FOLDING page's own original slot (e.g. halfW for
  a forward flip) — instead of the slot it actually rotates onto once
  closed (the opposite, static side, x=0 for forward). That meant the
  static side sat frozen on its old page for the entire drag and then
  popped straight to the new page in a single frame right at release,
  while the mid-drag frames (correctly) showed the flap already
  sweeping toward that same opposite side — the shortcut's landing spot
  simply didn't match where the animation had been heading. Fixed by
  drawing the closed flap at `dir === 1 ? 0 : halfW` instead. Verified
  frame-by-frame with a slow scripted drag + release: the flap now
  visibly grows to cover the opposite page and the release animation
  lands exactly where the drag was already pointing, no jump.
  - Caught a second bug while re-checking backward flips specifically:
    the flap's text/artwork rendered upside-down whenever dragging from
    the left edge (`anchorDir=-1`), because the local drawing frame is
    rotated by an angle near 180° for that direction (curN's baseline is
    `{-1,0}`), and the flap texture was drawn straight into that rotated
    frame. Fixed by mirroring the image in place (`scale(-1,-1)` about
    the flap's own bounding-box center) whenever `n.x < 0`, rather than
    un-rotating the whole frame — mirroring at the same destination
    rectangle can't reintroduce a clip-coverage mismatch the way
    rotating differently from the already-established polygon clip
    could (confirmed: an earlier attempt at the un-rotate approach left
    a small black sliver at the flap's tip; the in-place mirror doesn't).
  - Re-ran the entire regression suite (single-page + all spread tests)
    afterward — everything still passes.

- **Smooth cover<->spread morph, replacing the last resize pop (2026-08-03,
  eleventh pass).** User feedback with a fresh Heyzine-vs-Kappzine
  recording (`fba52edc-Recording_20260803_183459.mp4`): "the first page
  will be always in the center. once we drag the page, it slowly, neatly
  moves to the right... see ours, its just flipping the page and
  suddenly we see the 2nd and 3rd page." Frame-by-frame study of
  Heyzine's own reference confirmed the cover stays a normal single-page
  curl right up to release, then the STAGE itself smoothly widens into
  the spread rather than snapping — exactly the transition still handled
  by an abrupt `resize()` call in the ninth/tenth passes.
  - Implementation (`runGrowMorph`/`runShrinkMorph`): since a canvas is
    just a bitmap, animating `canvas.width` while always drawing every
    page at its FINAL absolute position means the growing/shrinking
    canvas bounds naturally reveal or crop content on their own — no
    need to separately track or fade page positions. Opening: canvas
    width animates from the single-page width up to the spread width
    over 380ms while page 1 (now flattened, per the ordinary single-page
    curl that already ran) sits fixed at the left slot and page 2
    progressively reveals on the right as the canvas widens. Closing is
    the same in reverse.
  - Caught a real pre-existing bug while building this: closing FROM an
    interior spread back to the front cover starts with `spreadActive`
    already true (currentIndex=1 is interior, not a cover), so it was
    running the normal interior spread-flip formulas — which compute a
    "new right page" pairing that doesn't exist next to a cover,
    producing a broken half-blank spread instead of a proper closing
    curl. Fixed with a `boundaryClosing` flag that routes this specific
    drag through a new `renderBoundaryClosing`, reusing single-page
    mode's exact curl geometry (via `renderCornerCurl`'s rect options)
    scoped to just the flipping page's own half of the still-spread-sized
    canvas — which conveniently is also exactly the right starting point
    for the shrink morph that follows.
  - Verified: canvas width animates continuously (e.g. 460→679→917→920px
    across frames, not a single jump) in both directions, the boundary-
    closing curl itself looks like a normal single-page leaning peel, the
    full navigation cycle still lands on the correct page/spread at every
    step, and the entire pre-existing single-page regression suite still
    passes.

- **The cover stays visible and continuously reveals the spread underneath
  it — no separate "curl phase" then "morph phase" (2026-08-03, twelfth
  pass).** User feedback with a Heyzine screenshot: mid-flip, the cover's
  curl is large and STILL VISIBLE, with BOTH destination pages already
  fully rendered underneath it — not something that only appears after
  the curl finishes. The eleventh pass's "curl completes flat within a
  single-page canvas, THEN grow the canvas afterward" was two disconnected
  steps; Heyzine does one continuous thing.
  - Rebuilt as `renderBoundaryOpening`/`renderBoundaryClosing`: canvas
    width is now tied DIRECTLY to the drag distance `d` itself (as a
    fraction of this gesture's own closure distance), via
    `boundaryCanvasWidth()` — not a separately-timed animation. Page 2
    stays statically drawn at its final position the whole time; only
    the cover's own curl (single-page geometry, scoped to the left half)
    is actually animating, and growing/shrinking canvas.width naturally
    reveals or crops it since nothing else needs to move. `runGrowMorph`/
    `runShrinkMorph` from the eleventh pass are kept only as a fallback
    for the back-cover boundary, not yet re-verified against reference
    footage the way the front cover now is.
  - Since the canvas resizes mid-gesture, canvas-relative pointer
    coordinates would feed the canvas's own shifting, re-centering
    position back into the very drag distance driving it — switched to
    CLIENT-space (viewport) coordinates for this gesture specifically to
    avoid that feedback loop.
  - Caught and fixed two more issues along the way: (1) a real pairing
    bug in the interior spread formula when closing toward the BACK
    cover specifically (no valid "next" pairing to shift into, so the
    flap must settle back onto its own original slot, not the opposite
    one); (2) sizing the spread's dimensions fresh right at the moment a
    front-cover drag starts caused a visible snap in viewports wide
    enough for auto-spread but too narrow for two full-size pages
    (~640-1020px) — fixed by making the cover's OWN at-rest size already
    account for that constraint (`computeSingleDims`), so there's nothing
    to snap to when a boundary gesture picks up from it.
  - Verified: canvas width now tracks the drag itself frame-by-frame
    (e.g. 483→538→631→722→811→899→920px across increasing drag distances,
    matching the fraction dragged, not a fixed-duration animation) in
    both directions; the full navigation cycle, the previously-regressed
    jitter/hover/lean tests, and the sizing tests were all re-verified
    afterward.

## Still open
- **Cover <-> spread transition: user checked the twelfth-pass fix
  (2026-08-03) and said "its not correct" — NOT resolved, paused here for
  the day.** No further detail given yet on what's specifically still
  wrong (they said "we will discuss tomorrow"). Do not assume the
  continuous-width-tied-to-`d` mechanism itself is the right direction
  going in — re-examine with fresh eyes and, ideally, a new reference
  video/screenshot pointing at exactly what still looks off, the same
  way each prior round in this section was actually diagnosed (frame
  extraction + side-by-side comparison), rather than continuing to guess
  from the last screenshot alone. Everything through the twelfth pass
  (see entries above) is committed and pushed; the regression suite
  passes; but that only proves those specific checks are fine — it does
  NOT mean the transition matches Heyzine, per the user's own testing.
- Port the finalized engine (single + double-page spread) into
  `FlipbookViewer.tsx`, replacing StPageFlip — deferred, needs explicit
  go-ahead. Note: the production upload pipeline (`processPdf.ts`,
  `/api/flipbooks/[id]/upload`, `FlipbookViewer.tsx`) already exists and
  already stores each page's own width/height (arbitrary PDF page sizes,
  mixed portrait/landscape) and already renders responsively via
  StPageFlip's single/double/auto modes — the port is about swapping the
  page-turn *rendering* to this custom engine, not building upload/
  responsiveness from scratch.
- Once debug colors are no longer needed, swap back in `magazinePage()` /
  `coverArt()` (already written in the file, currently unused) for realistic
  page content.
