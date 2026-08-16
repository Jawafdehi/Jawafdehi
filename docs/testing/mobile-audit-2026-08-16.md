# Mobile audit — 2026-08-16

What actually breaks on phones, measured against **production `https://jawafdehi.org`**
(unauthenticated public reads only) on `main` @ `2ac392b`. Production's `index.html`
is byte-identical to this tree's, so every finding maps to source here.

**Instruments** (committed, re-runnable — see `tests/mobile/`):

| Run | Coverage |
| --- | --- |
| `tests/mobile/audit.mjs` | 7 viewports × 23 routes = **161 page-runs**, 0 failures |
| `tests/mobile/overlay-audit.mjs` | 7 overlays × 4 viewports, reachability |
| `tests/mobile/perf-audit.mjs` | 4 throttling profiles × 5 routes × 2 runs = 40 |
| `tests/mobile/engine-compare.mjs` | Chromium / WebKit / Firefox × 7 routes |

The device matrix, and why it is these sizes, is in
[`mobile-and-responsive-testing.md`](./mobile-and-responsive-testing.md).

---

## Headline

Layout width is **not** the problem the way it usually is — no route breaks its
grid, and CLS is near zero. Three other things are:

1. **The mobile menu's bottom is unreachable on every common phone** — including
   the Donate button. Proven, not inferred.
2. **`/report` and `/donate` overflow, and Chromium hides it** by zooming the
   page out up to **29%**. Both were invisible to the obvious check.
3. **The site is slow in a way Nepali networks and phones will feel**: home LCP
   **7.9 s** on Slow 4G, **24.3 s** on 3G; `/team` weighs **5.67 MB**.

Everything below is ranked by user impact, with the source location and a fix.

---

## S1 — The mobile navigation menu strands its own bottom

**`src/components/ui/sheet.tsx:39,41`**

`sheetVariants` gives the side sheet `h-full` and never gives it
`overflow-y-auto`. The nav panel's content is **884 px** tall. On any viewport
shorter than that the tail is outside the panel, the panel does not scroll, and
`<body>` is scroll-locked by Radix — so nothing can bring it into view.

These are **viewport** heights, not screen heights — the distinction matters here
more than anywhere: an iPhone 14's 844 px screen gives a 664 px viewport, and
testing at 844 understates the damage by three menu items.

| Viewport | Real device | Not fully in view | What is lost |
| --- | --- | --- | --- |
| 320×568 | SE1 / low-end Android | **6 of 16** | Search archive, Materials, Court cases, Research, **Donate**, Ask AI |
| **360×640** | mid Android | **5 of 16** | Materials (half-cut), Court cases, Research, **Donate**, Ask AI |
| 390×664 | **iPhone 12–15** | **4 of 16** | Court cases, Research, **Donate**, Ask AI |
| 412×839 | Pixel 7 — tallest common | 1 of 16 | Ask AI |
| 640×360 | landscape / split screen | **10 of 16** | everything from Products down |

The panel's content is a constant **884 px**, so *every* viewport shorter than
that loses something — which, after browser chrome, is every phone in the top-six
resolution list.

### Proven, not inferred

`tests/mobile/prove-nav-unreachable.mjs` opens the menu at 360×640 and tries every
gesture a user has. All of them fail:

| Attempt | Donate reachable? | `panel.scrollTop` |
| --- | --- | --- |
| just opened | no (`top: 784` in a 640 px viewport) | 0 |
| mouse wheel +600 | no | 0 |
| real touch drag, `Input.dispatchTouchEvent` ×3 | no | 0 |
| drag 560→200 | no | 0 |
| `Tab` ×24 (focus auto-scroll) | no | 0 |
| `donate.scrollIntoView()` | no | 0 |
| Playwright `.click()` (auto-scrolls, waits) | **times out** | — |

> **Instrument note.** The touch row originally used
> `Input.synthesizeScrollGesture` with `gestureSourceType: "touch"`, which
> scrolls **nothing** in this headless build — 0 px where the same call with the
> default source moves 400 px. That row was therefore recording a no-op as a
> failed attempt. Re-run with real `Input.dispatchTouchEvent` drags: the result
> is unchanged (`panel.scrollTop` 0, click still times out), so the finding
> stands — but if you write a touch-scroll assertion anywhere, assert that the
> gesture actually moved something first.

**Control:** at 360×**1000** the same menu shows every item. The defect is purely
viewport-*height*-dependent, which is exactly why a `Desktop Chrome`-only suite
has never seen it.

### Fix, verified causal

Injecting only `overflow-y: auto; overscroll-behavior: contain` onto the panel
flips the outcome: `.click()` on Donate succeeds and navigates to `/donate`.
`overscroll-contain` stops the scroll chaining to the locked body. This is a
shadcn/ui upstream default, so **any** other `Sheet` in the app has it too.

**What shipped is not that, and the difference matters.** Making the *panel* the
scrollport puts the `absolute` close button inside the scrollable overflow region,
so it scrolls away with the content — measured at 248px above the viewport by the
time Donate was reachable, i.e. exactly when a user most wants to close the menu.
So PR #325 puts the scrollport on a wrapper **inside** the panel instead:

```diff
-        {children}
+        <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain">{children}</div>
```

with `flex flex-col` on the panel (and `max-h-full` on the `top`/`bottom`
variants, which have no height constraint of their own). `flex-auto` rather than
`flex-1`, because `flex-1` sets `flex-basis: 0%` and collapses a content-sized
panel to nothing; `min-h-0` is what allows it to shrink below its content and so
actually scroll.

Verified on a build of that change: one scrollport inside the sheet, 864px of
content in a 528px port at 320×568, and Donate clicks through to `/donate` at both
320×568 and 360×640.

⚠️ **The gate had to change with it, and this is the reusable lesson.** The first
version of the reachability gate asked *"does the panel scroll?"* — which is
**false on the correct fix**, because the panel is deliberately left
`overflow-y: visible`. A gate phrased as "is the fix I imagined present?" fails a
better fix. The gate now asks the question the user cares about: for each control
below the fold, is there **any** scrollable ancestor inside the sheet that can
bring it into view. That passes the inner-wrapper design, still fails `main`, and
would pass a panel-level fix too.

---

## S2 — Two routes overflow, and Chromium conceals it

This is the most important *methodological* finding, so it is worth stating
plainly: the standard check for horizontal overflow,
`document.scrollWidth > window.innerWidth`, returns **0 on both broken routes**.

With `isMobile: true`, Chromium — like real Android Chrome — responds to content
wider than the layout viewport by **scaling the page down to fit** and reporting
the *inflated* `innerWidth`. `scrollWidth` then equals `innerWidth` and the page
looks clean while rendering up to 29% smaller than designed.

Measure against the width you **asked for**, never `innerWidth`:

| Route | 320 | 360 | 375 | 390 | 412 | 640 | 810 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/report` overflow | 65 px | 65 px | 65 px | 65 px | 65 px | 73 px | 102 px |
| `/report` zoom-out | **20%** | 18% | 17% | 17% | 16% | 11% | 13% |
| `/donate` overflow | **94 px** | 55 px | 39 px | 24 px | 2 px | 0 | 0 |
| `/donate` zoom-out | **29%** | 15% | 10% | 6% | 0% | 0% | 0% |

At 320 px wide, `/donate` body text specified at 16 px paints at ~**12.4 px**.

### `/report` — a `sr-only` file input that is not actually `sr-only`

**`src/components/CaseReportForm.tsx:363-371`** (`input#evidence`) is the **whole**
65 px: with shrink-to-fit disabled (`isMobile: false`, so the layout viewport
stays 360) it is the *only* unclipped element past the viewport edge —
`scrollWidth` 425 against a requested 360.

The call site already does the right thing:

```jsx
<Input id="evidence" type="file" … className="sr-only" />
```

**and `sr-only` still loses.** This is the interesting part, and it is not what a
first reading suggests:

1. `Input` (`src/components/ui/input.tsx:11`) hard-codes `flex h-10 w-full …` into
   its base string.
2. `cn()` is `twMerge(clsx(...))`. `sr-only` and `w-full`/`h-10` are in **different
   tailwind-merge conflict groups**, so twMerge keeps all of them — the element
   ships `… h-10 w-full … sr-only`.
3. Both are single-class selectors, so **specificity ties and source order
   decides** — and Tailwind emits the `accessibility` plugin before `width`/
   `height`. Measured in the production stylesheet: `.sr-only` is rule **#169**,
   `.h-10` **#324**, `.w-full` **#480**.

So `sr-only`'s `width: 1px; height: 1px` is overridden and the input computes to
`position: absolute; width: 360px; height: 40px; overflow: clip;
clip: rect(0,0,0,0)`. It is *invisible* — the clip still applies — but it is
**laid out at full size**, and an absolutely-positioned box still extends
`scrollWidth`. That is why no one caught this by looking: the page appears
correct, `sr-only` appears present, and the only symptom is 65 px of overflow
that Chromium then hides by zooming out 18%.

The element is oversized in **all three engines**, but the page-level consequence
differs — worth knowing, because it changes which engine you can reproduce in:

| Engine @ 390 wide | oversized element? | document overflows? |
| --- | --- | --- |
| Chromium | yes | masked — `innerWidth` inflated to 455, `scrollWidth` 455 |
| WebKit | yes | **yes** — `scrollWidth` 455 vs viewport 390 |
| Firefox | yes | no — clipped, `scrollWidth` stays 390 |

`/donate` is simpler: WebKit and Firefox both overflow by 22 px, Chromium masks
it the same way (`innerWidth` 414).

**Fix:** a visually-hidden input needs no input styling, so don't route it
through the styled component at all — that removes `w-full h-10` rather than
trying to out-specify them. The `<label>` wrapping it is already the visible
affordance (a 152 px-tall dashed drop zone), and `label[for]` keeps the plain
input operable and focusable.

```diff
-                    <Input
+                    <input
                         id="evidence"
                         type="file"
                         ref={fileInputRef}
                         onChange={handleFileChange}
                         className="sr-only"
```

Verified causal on production with `tests/mobile/verify-report-fix.mjs`: setting the
element's class to `sr-only` alone takes its box from **360×40 → 1×1** and the
document from **425 → 360**, i.e. overflow **65 px → 0**, with
`label[for="evidence"]` intact and the input still focusable.

> Anything else that hides an `Input`/`Button` with `sr-only` has the same
> problem. `class:` order in the JSX is irrelevant — only the **stylesheet**
> order is, and no amount of reordering the `className` string changes it.

### `/donate` — a `whitespace-nowrap` CTA with a long Nepali label

**`src/components/donate/info.tsx:264`** — `<Button asChild variant="primary"
size="sm" className="mt-1 w-fit …">` wrapping the PayPal link. The chain measured
by `tests/mobile/find-minwidth-culprit.mjs`:

```
article  min-content 398px      ← overflows a 358px grid track
└ div    min-content 350px
  └ a    min-content 350px  whitespace-nowrap
         "PayPal Giving Fund मार्फत आर्थिक सहयोग गर्नुहोस्"
```

`whitespace-nowrap` is in the `buttonVariants` **base** string
(`src/components/ui/button.tsx:8`), and `w-fit` sizes the button to that
content; the grid item's `min-width: auto` then floors the track at the resulting
min-content width. **This is a localisation defect as much as a layout one** —
the English label fits, the Nepali one does not, and Nepali is the default
(`<html lang="ne">`). `size="sm"` also makes it 36 px tall.

```diff
-<Button asChild variant="primary" size="sm" className="mt-1 w-fit gap-1.5">
+<Button asChild variant="primary" size="sm"
+        className="mt-1 h-auto min-w-0 w-full gap-1.5 whitespace-normal py-3 text-center sm:w-fit">
```

Any `Button` with a long localised label is exposed to the same thing; a
`whitespace-normal` variant would be the general fix.

---

## S3 — Performance: what a Nepali phone actually pays

Medians of 2 runs, 360×640, CDP-throttled. `slow-4g-cpu4` is Lighthouse's mobile
default (1.6 Mbit/s, 150 ms RTT, 4× CPU).

| Profile | Route | FCP | **LCP** | **TBT** | CLS | Transfer |
| --- | --- | --- | --- | --- | --- | --- |
| slow-4g + 4×CPU | home | 1 800 ms | **7 926 ms** | 913 ms | 0.002 | 1 317 KB |
| slow-4g + 4×CPU | cases | 1 824 ms | 3 638 ms | 830 ms | 0 | 1 275 KB |
| slow-4g + 4×CPU | data-quality | 1 738 ms | 1 738 ms | 981 ms | 0.006 | 1 435 KB |
| 3g + 6×CPU | home | 3 544 ms | **24 280 ms** | 1 530 ms | 0.002 | 1 318 KB |
| 3g + 6×CPU | cases | 3 684 ms | 9 560 ms | 1 377 ms | 0 | 1 275 KB |
| fast-4g + 4×CPU | home | 594 ms | 2 422 ms | 902 ms | 0.002 | 1 334 KB |
| unthrottled | home | 124 ms | 414 ms | 115 ms | 0 | 1 704 KB |

Against Google's thresholds (LCP good ≤2.5 s / poor >4 s; TBT good <200 ms /
poor >600 ms): **home LCP is nearly 2× "poor" on Slow 4G**, and **TBT is "poor"
on every throttled profile including fast 4G** — TBT is CPU-bound, so bandwidth
will not save it.

**CLS is excellent (0–0.006) — genuinely well done, and worth protecting.**

### The home LCP element is *text*, and the font resets it

The LCP element on `/` is the hero `<p>` — not an image. FCP is 1.8 s, so the
pre-rendered text paints early; LCP lands at 8.0 s because the **327 KB
Devanagari font arrives at 4 487 ms and `font-display: swap` re-renders the
text**, registering a new, later LCP candidate.

So the font *is* the home LCP.

### ⚠️ …but preloading it does **not** fix that. Measured, A/B.

The obvious conclusion from the paragraph above is "preload the font". That was
this document's recommendation, and it is wrong. Tested by building both trees and
serving each from a local server that brotlis exactly what Cloudflare does (the
font at **273 KB** on the wire), Slow 4G + 4× CPU, 3 runs, medians:

| | FCP | **LCP** | font requested | font arrives | LCP candidates |
| --- | --- | --- | --- | --- | --- |
| no preload | 1 148 ms | **6 120 ms** | 1 002 ms (by CSS) | 4 773 ms | 2 |
| `<link rel=preload>` | 1 404 ms | **6 112 ms** | **185 ms** (by link) | 4 558 ms | 2 |

The preload does exactly what it says — the request moves from 1 002 ms to 185 ms,
and `initiatorType` changes from `css` to `link`. **LCP does not move** (0.1%), and
**FCP gets ~250 ms worse**.

The reason is that LCP here is bound by *total bytes on a saturated link*, not by
discovery order. Home ships **912 KB** of JS + CSS + font (brotli'd), and at
1.6 Mbit/s that is ~4.6 s of pure transfer. Requesting the font earlier does not
make it smaller — it just makes it compete with the CSS and JS that FCP needs,
which is why FCP regressed. One run of three did land the ideal outcome (font in
at 1 648 ms, a single LCP candidate, LCP == FCP), but that depends on winning a
bandwidth race, not on the preload.

⇒ **Shrink first, preload second.** A preload is worth adding *after* the face is
subset, when it is small enough not to displace anything. Adding it now is not a
performance improvement, and this document previously implied it was.

Two follow-on corrections from the same measurement:

- The home page does **not** load the four Vesper Libre faces — fonts are only
  fetched when rendered text actually uses them. Their 348 KB is a cost on the
  pages that use them, not on `/`.
- `markdown-*.js` **is** on the home critical path (83.5 KB brotli'd, via
  `modulepreload`), but making it lazy is not free: `vite.config.ts:217-223`
  documents that the markdown stack must stay an **eager** import because
  CaseDetail is pre-rendered, and a `lazy()` boundary would pre-render as the
  Suspense fallback and ship empty HTML. Any fix has to respect that.

### Fonts: 660 KB of brotli'd TTF, unsubsetted, unpreloaded

`src/index.css:3-45`. Wire bytes measured with `Accept-Encoding: br`:

| File | On disk | On the wire | Format |
| --- | --- | --- | --- |
| `NotoSansDevanagari-VariableFont_wdth,wght.ttf` | 647 144 | **329 700** | brotli'd TTF |
| `VesperLibre-Bold.ttf` | 165 920 | 90 698 | brotli'd TTF |
| `VesperLibre-Medium.ttf` | 166 120 | 90 657 | brotli'd TTF |
| `VesperLibre-Black.ttf` | 163 788 | 84 189 | brotli'd TTF |
| `VesperLibre-Regular.ttf` | 164 076 | 83 108 | brotli'd TTF |
| `IBMPlexMono-400.woff2` | 14 708 | 14 708 | woff2 |

Cloudflare does brotli the TTFs, so this is **not** the 1.3 MB the repo suggests
— but WOFF2 applies font-specific transforms *on top of* brotli and typically
beats brotli'd TTF by a further 10–30%, and subsetting to the codepoints actually
used beats both. Three changes, in value order:

1. **Convert all 5 TTFs to WOFF2 and subset them** (Devanagari + Latin + the
   digits and punctuation used) — `fonttools`/`pyftsubset` in the build. This is
   the only one of the three that reduces bytes, and bytes are what bound LCP
   here. ⚠️ Verify glyph coverage across **both** locales before shipping: a
   too-aggressive subset shows tofu in Nepali rather than falling back
   gracefully.
2. **Drop unused Vesper weights.** Four static faces ship; the `display` stack
   uses far fewer. One variable WOFF2 would replace all four. This is a cost on
   the pages that use Vesper — not on `/`, which does not load it at all.
3. **Then** preload the subset Devanagari face:
   ```html
   <link rel="preload" href="/font/Noto_Sans_Devanagari/NotoSansDevanagari.woff2"
         as="font" type="font/woff2" crossorigin>
   ```
   In that order. Preloading the 273 KB face on its own was measured above as no
   LCP improvement and a small FCP regression.

### JS: one 535 KB chunk

| Chunk | Encoded | Decoded | Arrival on Slow 4G |
| --- | --- | --- | --- |
| `assets/index-*.js` | **535.0 KB** | ~1.9 MB | 6 551 ms |
| `assets/markdown-*.js` | 102.6 KB | — | 2 888 ms |
| `assets/react-vendor-*.js` | 54.7 KB | — | 1 723 ms |
| `assets/query-*.js` | 32.6 KB | — | 1 357 ms |
| `assets/i18n-*.js` | 21.4 KB | — | 1 079 ms |
| **total JS** | **746.4 KB** | **2 558.7 KB** | |

Vendors are split but the app chunk is not — 535 KB reaches every route,
including `/privacy`. `markdown-*.js` (102 KB) loads on the **home page**, which
renders no Markdown. Route-level `lazy()` boundaries and moving the Markdown
editor/preview behind one would cut the critical path materially.
`bun run analyze` already produces the treemap.

---

## S4 — Images: `/team` is 5.67 MB

Fully-scrolled transfer at 360×640:

| Route | Total | Images | JS | Font |
| --- | --- | --- | --- | --- |
| **`/team`** | **5.67 MB** | **4 689 KB** (20 files) | 747 KB | 328 KB |
| `/` | 1.57 MB | 461 KB (13) | 747 KB | 328 KB |
| `/cases` | 1.25 MB | 112 KB (11) | 747 KB | 328 KB |

Worst offenders, all rendered at **112×112 CSS px**:

| File | Bytes | Intrinsic | Oversize at DPR 3 |
| --- | --- | --- | --- |
| `assets/teammembers/anish.png` | **1 752 924** | 926×922 | 2.76× |
| `assets/teammembers/sujata.png` | **1 441 737** | — | — |
| `assets/teammembers/rujit.jpg` | 249 159 | 1810×1810 | **5.39×** |
| `assets/placeholder.png` (card fallback, ×4 on `/cases`) | 87 674 | 1920×1080 | 1.95× |
| `favicon.png` | 205 480 | — | — |

- **0 of 24** images on `/team` have `srcset`; **0** have `loading="lazy"`.
- `/team` ships **12.2 megapixels** where 2.6 MP suffices at DPR 3 — **4.8×** waste.
- A 1920×1080 PNG as the *placeholder* for a 328×208 card thumbnail.

Fixes: resize/re-encode avatars to ≤336 px (3× of 112) as WebP/AVIF; add
`srcset`/`sizes` and `loading="lazy"` (keep the LCP image eager); replace
`placeholder.png` with an inline SVG or a 400×250 WebP; shrink `favicon.png`.

---

## S5 — Touch ergonomics

### Every form field is 14 px → iOS Safari zooms on focus

**`src/styles/typography.css:179-183`** — `.font-input { @apply text-sm … }`.
`text-sm` is 14 px, and `Input`/`Textarea`/`SelectTrigger` all use `.font-input`.
**20 distinct fields** measured under 16 px, including the primary archive search
(`#hero-archive-search`, `#archive-search`, `#case-search`) and all 9 fields on
`/report`.

iOS Safari zooms the viewport when a focused field's font-size is below 16 px,
and `index.html`'s viewport meta sets no `maximum-scale`, so nothing suppresses
it. Tapping the search box therefore jumps and rescales the page — a signature
"broken on mobile" feel for the **22–26%** of Nepali mobile users on Safari/iOS.

**Honest limit:** this one is a *source-level inference* — measured 14 px plus a
well-documented iOS behaviour. It is not reproducible in Chromium, and Playwright's
Linux WebKit does not implement it either. It needs a real iPhone to observe,
which is precisely why it is worth a source gate.

One line fixes all 20, keeping desktop density:

```diff
 .font-input {
-  @apply text-sm font-normal text-foreground;
+  /* 16px on phones: iOS Safari zooms the page when a focused field is <16px. */
+  @apply text-base font-normal text-foreground sm:text-sm;
 }
```

⚠️ **That fix is incomplete at `sm:` and up, and the gate says so.** `sm` is
640px, so a **landscape phone** — `mobile-short`, 640×360, a real iPhone
orientation — gets `text-sm` back and still zooms on focus: iOS keys the zoom on
font-size, not on orientation. Measured against a build carrying the fix, the
input gate goes green on 3 of 4 projects and stays red-worthy on `mobile-short`,
where all fields are still 14px.

Consequence for merge order: `KNOWN_DEFECTS.inputZoomIsKnown` **cannot be deleted**
on the strength of the `sm:` fix alone — deleting it would put `mobile-short` red.
Either raise the breakpoint (`md:`, 768px) or key it to the input modality rather
than to width, which is what actually predicts the behaviour:

```css
/* zoom-on-focus is a touch-keyboard behaviour, not a narrow-screen one */
@media (pointer: coarse) { .font-input { font-size: 1rem; } }
```

### Tap target sizes

Measured with WCAG 2.2 SC 2.5.8 (AA, 24×24) **including** its spacing and
inline-in-sentence exceptions, and separately against the 44×44 of SC 2.5.5
(AAA) / Apple HIG:

- **2 genuine SC 2.5.8 AA failures**, both on `/search` (empty state), at 320 px
  and 375 px: 20 px-tall links in a metadata list, too close together for the
  spacing exception. Rendered by `src/components/CaseCard.tsx:194`.
- **201 occurrences of 40×40** icon buttons — `buttonVariants` `size: icon`
  (`h-10 w-10`) in `src/components/ui/button.tsx:31`, 4 px under 44.
  `size: sm` is `h-9` (36 px).
- **~18 links per page at 36 px tall** in the footer nav, on all 23 routes.
- The primary card CTA "विवरण हेर्नुहोस् →" is **296×40**.
- Entity/location links in case cards are **20 px** tall and stacked ~8 px apart.
  These pass AA via the spacing exception; they are still hard to hit accurately.

`navMenuIcon` is already `h-11 w-11` (44 px) — the pattern to copy. Raising
`icon` to `h-11 w-11` and footer links to `min-h-11` clears most of the list.

### Sticky header

76 px tall on every route: **12%** of a 360×640 first screen and **21%** of a
640×360 landscape one. Separately, `#main-content` has `scroll-margin-top: 0`,
so the skip link lands its target 76 px *under* the header.

---

## S5b — The hero stats band (found by scrolling, not by probing)

Driven with real touch flicks at 360×640 and 320×568 —
`tests/mobile/hero-stats-scroll.mjs`, `tests/mobile/header-bleed.mjs`. None of
these show up in the static sweep, because they are about *what the page looks
like while it is loading and while a thumb is moving it*.

### Three of the four figures ship blank

The served HTML for the hero band is:

```
.font-stat-value textContent:  ""   "Rs 1.90 Kharab"   ""   ""
```

**This is not an SSR gap.** SSR and pre-render both work, and the data is present
at render time — proof: `Rs 1.90 Kharab` renders, and every figure is in the
served `__REACT_QUERY_STATE__` payload. The cause is narrower.

`react-countup` renders its value as the span's **children**, and those children
are the *start* value (`node_modules/react-countup/build/index.js:434-438`):

```js
return React.createElement("span", { …, ref: containerRef, … },
  typeof props.start !== 'undefined' ? getCountUp().formattingFn(props.start) : '');
```

`HeroStatValue` (`src/components/home/hero.tsx:176-185`) passes **no `start`**:

```jsx
return <CountUp end={numericValue} duration={0.9} separator="," />;
```

…so the server-rendered children are the empty string, and the real figure only
appears when the client effect mutates the node. `Rs 1.90 Kharab` survives purely
because `Number("Rs 1.90 Kharab")` is `NaN` and it takes the raw-string branch.

**There is a second, independent way to display the wrong number, and it kills
the obvious fix.** `countup.js` writes `startVal` into the element from its
**constructor** — `if (this.el) { this.printValue(this.startVal) }` — and
react-countup calls `getCountUp()` on mount *regardless* of `startOnMount`. So a
figure can server-render correctly and still flip to `0` the instant it hydrates.

Both axes measured — SSR with `renderToString`, first frame by mounting with the
element off-screen (`tests/ssr/animated-count.test.tsx`):

| form | SSR HTML | after mount, off screen |
| --- | --- | --- |
| as shipped, no `start` | `<span></span>` | `0` ← the defect |
| `start={0}` | `<span>0</span>` | `0` ← a false claim, not a missing one |
| render-prop `children={({countUpRef}) => …}` | `<span>82</span>` | **`0`** ← reads correct, is not |
| render-prop + `enableScrollSpy scrollSpyOnce` | `<span>82</span>` | **`0`**, until scrolled into view |
| `start={numericValue}` | `<span>82</span>` | `82` |
| `start={numericValue}`, 7 digits | `<span>2,245,189</span>` | `2,245,189` — `separator` applied |
| render-prop + `start={numericValue}` | `<span>82</span>` | `82` |

⚠️ **The two render-prop rows are the trap, and an earlier revision of this
document recommended one of them.** They fix the served HTML and then blank the
figure on hydration; with `enableScrollSpy` that `0` *persists until the band is
scrolled into view*, which on a phone is exactly the case that matters. Checking
only the served HTML says the fix works.

So until the 535 KB bundle hydrates — **~6 s on Slow 4G** — a corruption archive
shows three labels with no figures above them:
*दस्तावेजीकृत मुद्दाहरू* (documented cases), *कागजात तथा अन्य सामग्री*
(materials), *अनुगमन गरिएका अदालती मुद्दा* (court cases tracked). The empty
values have `height: 0`, so the labels also sit at the wrong baseline next to the
one populated cell, and all three pop in together when JS lands.

Reproduce, screenshots included:
`node tests/mobile/hero-stats-scroll.mjs --width 360 --height 640`
→ `test-results/mobile/hero-stats/360x640/00-00-served-markup.png`.

### Fix

No prop combination gives both a correct static figure *and* an animation:
animating up from zero means `startVal` is 0, and countup.js prints `startVal` the
moment it is constructed. So either the number is momentarily wrong, or there is
no animation.

`start={numericValue}` is the one-prop fix and is correct at every instant — it
just also gives up the animation on desktop, where the band *is* above the fold
and the animation *is* seen.

To keep both, don't let CountUp own the element until it is on screen. That is
what `AnimatedCount` (`src/components/ui/animated-count.tsx`) does:

```jsx
// true figure as text, until the figure is actually visible
if (animate) return <CountUp end={end} duration={duration} separator={separator} />;
return <span ref={hostRef}>{display ?? end.toLocaleString("en-US")}</span>;
```

- no JS, or JS still loading → the true figure, crawlable and accessible;
- on screen → animates, exactly as before;
- below the fold → the true figure until scrolled to, where a mount-time
  animation would have been spent long before a thumb arrived.

**Do not use `start={0}`,** and do not use either render-prop form: all three
render a literal `0`, which turns a missing figure into a false one — "0
documented cases" on a corruption archive.

**The same defect is at three call sites,** not one: the home hero,
`data-quality/EvidenceBackbone.tsx` (scale tiles) and
`data-quality/AccountabilityGap.tsx` (documented total). Note that
`AccountabilityGap.test.tsx` already *mocks* `react-countup` "to render the final
value immediately" — the suite had been working around this rather than failing on
it.

A figure that is correct without JS is also the accessible and crawlable one.

### `Rs 1.90 Kharab` is the only value that wraps, so the 2×2 grid is ragged

| Width | Cell heights | Why |
| --- | --- | --- |
| 360 | `[103, 103, 78, 78]` | `Rs 1.90 Kharab` takes 2 lines (50 px) vs 25 px for every number |
| 320 | `[103, 103, 96, 96]` | as above, plus the 4th label wraps to 2 lines |

Each cell is a `<Link>` with its own card background, so the 25 px mismatch reads
as dead space under **82**. `grid-cols-2` sizes rows independently, so the top row
inherits the tallest cell. Either let the money value abbreviate/not wrap, or make
the value box a fixed two-line box so all four agree.

### The count-up animation is never seen on a phone

The band sits at document **y = 592** in a 640 px viewport, so it is 48 px
on-screen at rest. `CountUp` has no `enableScrollSpy`, so it runs its 0.9 s
animation on mount, while the band is still essentially below the fold. Measured
mid-flick frames caught `81 → 82` and `2,245,134 → 2,245,189`, i.e. the figure is
still settling as the band scrolls into view and is static by the time it can be
read. Either add `enableScrollSpy` or drop the animation on phones.

### The figures are smallest on the platform that matters most

`.font-stat-value` is `text-xl md:text-3xl` — **20 px on phones**, 30 px on
desktop; `.font-stat-label` is `text-xs sm:text-sm` — **12 px on phones**
(`src/styles/typography.css:197-208`). The hero headline beside them is 36 px. On
61% of traffic the archive's headline numbers are barely larger than their labels.

Minor, but worth a decision: the value's computed family resolves to
**Noto Sans Devanagari**, not the IBM Plex Mono "register" face the design system
reserves for *"figures, counts, dates and case references"*. The most prominent
figures on the site are the ones not set in it.

---

## S5c — Content reads through the sticky header while scrolling

**`src/components/Navbar.tsx:196`** — the `<header>` is `bg-transparent` with no
`backdrop-filter`, at **every** scroll position. `isScrolled` only turns on
backgrounds for the controls *inside* it (logo pill, search and menu buttons,
language toggle), so the page scrolls directly behind the band and only those four
pills mask anything.

Measured at eight real scroll positions on the home page:

| scrollY | full-width masks | text under the header | worst overlap |
| --- | --- | --- | --- |
| 0 | 0 | 0 | — |
| 258 | 0 | 2 | `स्थायी अभिलेख` (hero headline) — **46 px** |
| 503 | 0 | 1 | `जवाफदेही अभिलेखमा खोज्नुहोस्` — 21 px |
| 1 336 | 0 | 1 | `Rabi Lamichhane Cooperative Fraud` — 23 px |
| 3 045 | 0 | 1 | `समाधान भएको` — 16 px |
| 5 873 | 0 | 1 | `जवाफदेहीलाई कसरी कोष जुटाइन्छ?` — 17 px |
| 7 973 | 0 | 2 | `स्रोतहरू` — 19 px |

`header.backgroundColor` is `rgba(0, 0, 0, 0)` and `backdropFilter` is `none`
throughout, and **no element in the header subtree paints a full-width backdrop**.
Reproduce: `node tests/mobile/header-bleed.mjs --width 360 --height 640` →
`test-results/mobile/header-bleed/360x640/hdr-00258.png`, where the hero headline
runs straight through the band between the pills.

This is worse on a phone than on desktop: a desktop header carries a full nav row
that incidentally covers most of the band, while a 360 px header has four small
pills and mostly open space. Devanagari makes it worse again — tall matras and
conjuncts collide with the pill shapes.

Fix: give the header itself a background once scrolled, matching what the pills
already do — e.g. `isScrolled && "bg-background/85 backdrop-blur-md"` on the
`<header>`, or a masked pseudo-element. Note it is `bg-transparent` deliberately
at `scrollY: 0` for the hero, so gate the change on `isScrolled` rather than
making it unconditional.

---

## S6 — Reading and density

### Pages are very long on a phone

Measured from full-page screenshot heights ÷ DPR, at 360 px wide:

| Route | CSS px | 640 px screens |
| --- | --- | --- |
| `/research/corruption-accountability` | 16 690 | **26.1** |
| `/privacy` | 12 126 | 18.9 |
| `/team` | 10 122 | 15.8 |
| `/data-quality` | 8 825 | 13.8 |
| `/` | 8 613 | 13.5 |
| `/cases` | 8 300 | 13.0 |
| *median of 23 routes* | | **7.0** |

Driver: **91** occurrences of `py-10`…`py-24` (64–96 px) with **no** responsive
prefix, against 48 that do scale (`md:py-*`). Ten sections at an unscaled `py-16`
is 1 280 px — two full phone screens of padding. Pattern to apply, which the
codebase already uses in places: `py-8 md:py-16`.

### Devanagari below 12 px

18 tiny-text instances; 4 are Devanagari, where matras and conjuncts degrade far
worse than Latin does at the same size:

| Size | Route | Sample |
| --- | --- | --- |
| 10 px | `/donate` | `नाम` |
| 11 px | `/data-quality` | `अस्पताल` |
| 11 px | `/research` | `नक्कली प्रमाण पत्र` |
| 11.5 px | `/research` | `केदार प्रसाद चालिसे` |

The rest are Recharts axis/label text at 10–11 px on `/research` (11) and
`/data-quality` (4). Set a **12 px floor for Latin and 13 px for Devanagari**;
`useIsNarrow()` already exists to feed chart props on phones.

### Minor

- The hero search placeholder truncates mid-word at 360 px:
  `…वा आरोपले खं` (should end `खोज्नुहोस्`). Use a shorter phone placeholder.
- `useIsMobile()` (768 px) and `useIsNarrow()` (640 px) both exist and disagree
  about what "mobile" means. Pick one and document it.

---

## What is already right

Worth recording so nobody "fixes" it:

- **No route breaks its layout grid.** Excluding the two shrink-to-fit cases,
  overflow is 0 across 161 page-runs from 320 px to 810 px.
- **CLS 0–0.006.**
- Tables are wrapped in scroll containers — `ResponsiveTable.tsx:202`,
  `ui/table.tsx:7`.
- `FloatingShareSidebar` is correctly `hidden lg:flex`.
- `ReportCaseDialog` and `UseThisData` already do mobile dialogs *properly*:
  `h-[calc(100dvh-2rem)]` on phones with `sm:` breakouts — **`dvh`, not `vh`**.
  This is the pattern the sheet should adopt.
- `navMenuIcon` at 44 px, and `tests/layout/page-container.test.ts` as a
  source-level guard, are both good existing patterns to extend.

---

## Cross-engine

Same viewport (390×844), three engines, via the official Playwright Docker image
(WebKit cannot launch on this Amazon Linux host — see the guideline):

Layout is **remarkably consistent**: per-route `scrollHeight` deltas are −56…+13 px
out of 4 000–16 000. No WebKit- or Firefox-only layout break was found. The
engine pass earned its keep differently — WebKit does *not* apply Chromium's
shrink-to-fit, which is how the `/report` and `/donate` overflow surfaced at all.

---

## Process gaps that let all of this through

1. **`playwright.config.ts` had only `Desktop Chrome` projects** — zero mobile
   viewport coverage. Fixed in this branch: four `mobile-*` projects.
2. **Playwright never ran in CI.** `ci.yml` ran lint + vitest + build and nothing
   ever executed `bun run e2e`. Fixed in this branch: a `phone-gates` job builds
   the client, serves it with `vite preview`, and runs all four `mobile-*`
   projects — 92 gates, ~18 s. It deliberately skips `bun run build`'s pre-render
   and sitemap steps so the job never depends on the API being reachable; the
   trade-off is that list routes are gated in their empty state.
   **Still open:** `test.yml` runs lint + build and **no tests at all** — it is a
   redundant copy of `ci.yml` minus the test step. Deleting it is a maintainer
   call (branch protection may reference it), so this branch leaves it alone.
3. **CI is hostage to a live external API, on a 10 s timeout.** Observed while
   landing this work: six PRs opened together put twelve concurrent `bun run build`
   jobs against `api.jawafdehi.org`, and three of them failed — not on anything in
   the diff, but on `Request timed out after 10000ms fetching
   https://api.jawafdehi.org/api/cases/?page=3`. `scripts/sitemap.ts` treats that
   as `FATAL` ("refusing to write a sitemap missing every case") and `pre-render`
   raises "the API is unreachable, so every pre-rendered page would ship empty".
   Both refusals are individually right — a silently-empty sitemap or pre-render is
   worse than a failed build — but together they mean **any PR can go red because a
   third-party host was briefly slow**, which trains reviewers to ignore red.
   Worth separating: pre-render/sitemap belong to *release*, not to *pull-request
   validation*. This is also why the `phone-gates` job runs `bunx vite build`
   rather than `bun run build` — it never touches the API, and it was the one job
   that stayed green through the incident.
4. **No performance budget**, no Lighthouse, no bundle-size gate — a 1.67 MB PNG
   reached production.
5. **No image pipeline** — no `srcset` anywhere, originals served as authored.
6. **The docs claim what nothing tests.** `.kiro/steering/product.md:13,125` and
   `.github/copilot-instructions.md:15,127` both assert "Mobile-First:
   Responsive design for all screen sizes"; `README.md` claims "**Responsive
   Design** - Mobile, tablet, and desktop optimized".

---

## Fix order

| # | Change | Effort | Effect |
| --- | --- | --- | --- |
| 1 | `overflow-y-auto overscroll-contain` on `sheetVariants` | 1 line | Donate + 4 nav destinations become reachable on every phone |
| 2 | `.font-input` → `text-base sm:text-sm` | 1 line | kills iOS focus-zoom on all 20 fields |
| 3 | `AnimatedCount` at the 3 `CountUp` sites | small | 3 hero figures stop shipping blank for ~6 s, and never show a false `0` |
| 4 | **Subset + WOFF2** the Devanagari font, *then* preload | medium | the only lever measured to reduce the 912 KB that bounds home LCP — preload alone moved LCP 0.1% |
| 5 | Resize `/team` avatars, `placeholder.png`, `favicon.png`; add `srcset` + `loading=lazy` | small | `/team` 5.67 MB → <1 MB |
| 6 | Plain `<input>` for the hidden file field; wrap the donate CTA | 2 lines | removes 11–29% page zoom-out on 2 routes |
| 7 | `icon` → `h-11 w-11`; footer links `min-h-11` | small | clears most sub-44 px targets |
| 8 | Split the 535 KB app chunk (see the `vite.config.ts:217` pre-render constraint before touching the markdown chunk) | medium | TBT 900 ms → target <300 ms |
| 9 | `py-8 md:py-16` sweep across the 91 unscaled paddings | medium | roughly halves phone page length |
| 10 | ~~Run the `mobile-*` Playwright projects in CI~~ — **done, `ci.yml` `phone-gates`** | small | stops all of the above regressing |
