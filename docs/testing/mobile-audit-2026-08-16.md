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
| CDP `synthesizeScrollGesture`, touch, ×3 | no | 0 |
| drag 560→200 | no | 0 |
| `Tab` ×24 (focus auto-scroll) | no | 0 |
| `donate.scrollIntoView()` | no | 0 |
| Playwright `.click()` (auto-scrolls, waits) | **times out** | — |

**Control:** at 360×**1000** the same menu shows every item. The defect is purely
viewport-*height*-dependent, which is exactly why a `Desktop Chrome`-only suite
has never seen it.

### Fix, verified causal

Injecting only `overflow-y: auto; overscroll-behavior: contain` onto the panel
flips the outcome: `.click()` on Donate succeeds and navigates to `/donate`.

```diff
--- a/src/components/ui/sheet.tsx
+++ b/src/components/ui/sheet.tsx
@@ -36,10 +36,10 @@ const sheetVariants = cva(
-        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top …",
-        bottom:
-          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom …",
-        left: "inset-y-0 left-0 h-full w-3/4 border-r … sm:max-w-sm",
-        right:
-          "inset-y-0 right-0 h-full w-3/4  border-l … sm:max-w-sm",
+        top: "inset-x-0 top-0 max-h-full overflow-y-auto overscroll-contain border-b …",
+        bottom:
+          "inset-x-0 bottom-0 max-h-full overflow-y-auto overscroll-contain border-t …",
+        left: "inset-y-0 left-0 h-full w-3/4 overflow-y-auto overscroll-contain border-r … sm:max-w-sm",
+        right:
+          "inset-y-0 right-0 h-full w-3/4 overflow-y-auto overscroll-contain border-l … sm:max-w-sm",
```

`overscroll-contain` stops the scroll chaining to the locked body. This is a
shadcn/ui upstream default, so **any** other `Sheet` in the app has it too.

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

### `/report` — `input[type=file]` ignores `w-full`

**`src/components/CaseReportForm.tsx:367`** (`input#evidence`). A file input's
intrinsic width (native "Choose file" button + Nepali label text) beats
`width: 100%`; the computed width is 360 px inside a 280 px parent.

The element is oversized in **all three engines**, but the page-level consequence
differs — worth knowing, because it changes which engine you can reproduce in:

| Engine @ 390 wide | oversized element? | document overflows? |
| --- | --- | --- |
| Chromium | yes | masked — `innerWidth` inflated to 455, `scrollWidth` 455 |
| WebKit | yes | **yes** — `scrollWidth` 455 vs viewport 390 |
| Firefox | yes | no — clipped, `scrollWidth` stays 390 |

`/donate` is simpler: WebKit and Firefox both overflow by 22 px, Chromium masks
it the same way (`innerWidth` 414).

The parent is already a styled `<label>` with a dashed border — it is the visible
affordance — so the native input should not be laid out at all:

```diff
-  className="font-input flex h-10 w-full rounded-md border border-input …"
+  className="sr-only"
```

…keeping the `<label>` as the control. If it must stay visible, `min-w-0
max-w-full` plus `file:` utilities is the narrower fix.

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

So the font *is* the home LCP. Preloading and shrinking it is the single highest-
value performance change available.

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

1. **Preload the Devanagari face** — nothing else moves home LCP as much:
   ```html
   <link rel="preload" href="/font/Noto_Sans_Devanagari/NotoSansDevanagari.woff2"
         as="font" type="font/woff2" crossorigin>
   ```
2. **Convert all 5 TTFs to WOFF2** and subset (Devanagari + Latin + the digits
   and punctuation used). `fonttools`/`pyftsubset` in the build.
3. **Drop unused Vesper weights.** Four static faces ship; the `display` stack
   uses far fewer. One variable WOFF2 would replace all four.

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
2. **Playwright never ran in CI.** `ci.yml` runs lint + vitest + build;
   `test.yml` runs lint + build and **no tests at all** (it is a redundant copy
   of `ci.yml` minus the test step). Nothing ever executed `bun run e2e`.
3. **No performance budget**, no Lighthouse, no bundle-size gate — a 1.67 MB PNG
   reached production.
4. **No image pipeline** — no `srcset` anywhere, originals served as authored.
5. **The docs claim what nothing tests.** `.kiro/steering/product.md:13,125` and
   `.github/copilot-instructions.md:15,127` both assert "Mobile-First:
   Responsive design for all screen sizes"; `README.md` claims "**Responsive
   Design** - Mobile, tablet, and desktop optimized".

---

## Fix order

| # | Change | Effort | Effect |
| --- | --- | --- | --- |
| 1 | `overflow-y-auto overscroll-contain` on `sheetVariants` | 1 line | Donate + 4 nav destinations become reachable on every phone |
| 2 | `.font-input` → `text-base sm:text-sm` | 1 line | kills iOS focus-zoom on all 20 fields |
| 3 | Preload + WOFF2 + subset the Devanagari font | small | home LCP ~7.9 s → ~2 s on Slow 4G |
| 4 | Resize `/team` avatars, `placeholder.png`, `favicon.png`; add `srcset` + `loading=lazy` | small | `/team` 5.67 MB → <1 MB |
| 5 | `sr-only` the file input on `/report`; wrap the donate CTA | 2 lines | removes 11–29% page zoom-out on 2 routes |
| 6 | `icon` → `h-11 w-11`; footer links `min-h-11` | small | clears most sub-44 px targets |
| 7 | Split the 535 KB app chunk; lazy-load the Markdown editor | medium | TBT 900 ms → target <300 ms |
| 8 | `py-8 md:py-16` sweep across the 91 unscaled paddings | medium | roughly halves phone page length |
| 9 | Run the `mobile-*` Playwright projects in CI | small | stops all of the above regressing |
