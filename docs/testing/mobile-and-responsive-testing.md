# Mobile & responsive testing

How to build and test this SPA for the phones our readers actually hold, and how
to keep phone regressions out without slowing the loop down.

Companion: [`mobile-audit-2026-08-16.md`](./mobile-audit-2026-08-16.md) — the
first full run of everything described here, with the defects it found.

---

## 1. Who we are building for

**Sixty-one per cent of Nepali web traffic is a phone.** Every number below is
StatCounter Global Stats, Nepal, **July 2026** — re-derive before quoting, they
move.

| Platform split (all traffic) | | Mobile OS | | Mobile browser | |
| --- | --- | --- | --- | --- | --- |
| Mobile | **61.38%** | Android | **73.7%** | Chrome | **74.36%** |
| Desktop | 38.17% | iOS | **26.3%** | Safari | **22.09%** |
| Tablet | **0.45%** | other | ~0% | UC Browser | 1.68% |
| | | | | Opera / Samsung / Brave | <1% each |

Reported mobile screen resolutions — the top six are only ~50% of traffic, so the
tail is long and no single device is worth optimising for:

| Screen | Share | | Screen | Share |
| --- | --- | --- | --- | --- |
| 414×896 | 14.72% | | 384×832 | 6.28% |
| 360×800 | 12.62% | | 390×844 | 4.69% |
| 393×873 | 8.43% | | 385×854 | 3.43% |

Four things follow, and they are the whole basis of the matrix in §2:

1. **Android-first, but iOS is a quarter of our phone users.** An
   iOS/Safari-only defect — focus-zoom, `100vh`, `-webkit-` scrolling — hits
   roughly one mobile reader in four. Not an edge case.
2. **Tablets are 0.45%.** Do not spend a gate on iPad. Check it before a
   redesign ships and otherwise ignore it.
3. **⚠️ Those are SCREEN sizes, not viewport sizes.** Android Chrome spends
   ~80–120 CSS px of screen height on browser chrome, so a 360×800 handset gives
   a page roughly **360×690**, and a 393×873 gives ~393×760. Testing at the
   screen height tests a viewport nobody has. It is exactly this gap that hid the
   nav bug: the panel needs **884 px**, and while five of the six listed screens
   are 832–896 px tall, **not one of their viewports reaches 884** (an iPhone 14's
   844 px screen measures 664 px of viewport). Test at the screen height and the
   menu looks fine.
4. **Width and height are independent axes.** Most responsive bugs are width
   bugs, so most matrices only vary width. The worst defect we found is a
   **height** bug. Keep a deliberately short viewport in the matrix forever.

### Network and device budget

Assume a mid-range Android on a congested 4G cell, and remember mobile data in
Nepal is mostly prepaid — **bytes are a cost to the reader, not just a delay.**
Use Lighthouse's mobile defaults as the standing assumption:

- **Slow 4G** — 1.6 Mbit/s down, 750 Kbit/s up, 150 ms RTT
- **4× CPU throttle** — stands in for a mid-range SoC rather than a dev laptop

Our budgets, set from the 2026-08-16 measurements (current values in that doc):

| Metric | Budget on Slow 4G + 4× CPU | Why |
| --- | --- | --- |
| LCP | **≤ 2.5 s** | Google "good"; home was 7.9 s |
| TBT | **≤ 300 ms** | Google "good" is <200 ms; every route was 830–1000 ms |
| CLS | **≤ 0.05** | already 0–0.006 — this one is a *protect*, not a fix |
| Total transfer | **≤ 800 KB** per route | routes were 1.1–1.4 MB; `/team` 5.67 MB |
| JS transfer | **≤ 350 KB** | 746 KB today, one 535 KB chunk |
| Any single image | **≤ 150 KB** | a 1.67 MB PNG avatar reached production |

---

## 2. The device matrix

Three tiers. Only Tier A blocks a PR.

### Tier A — gates every PR (Chromium, 4 viewports, ~1 min)

Configured as the `mobile-*` projects in `playwright.config.ts`.

| Project | Viewport | Stands for |
| --- | --- | --- |
| `mobile-android` | **360×640** | the widest-share Android width class; height already net of browser chrome |
| `mobile-ios` | **390×664** | iPhone 12/13/14/15 **viewport** (the 844 is the screen) |
| `mobile-floor` | **320×568** | hard floor — 1st-gen SE, low-end Android, and where `/donate` was worst (29% zoom-out) |
| `mobile-short` | **640×360** | landscape phone / split screen. **Short, not narrow** — the axis that catches panel-overflow bugs |

Four viewports, not ten: 360/375/390/412 behave nearly identically, and the audit
confirmed it — `/report` overflowed by exactly 65 px at all five phone widths.
Adding widths buys almost nothing; adding a *height* bought the top finding.

> **⚠️ Two Playwright descriptor traps, both of which have bitten this repo:**
>
> 1. `devices["iPhone SE"]` is the **1st-gen** SE at 320×568, not the SE 2/3 at
>    375×667. Pin viewports explicitly instead of trusting a name.
> 2. `devices["iPhone 14"]` and `devices["iPad (gen 7)"]` carry
>    `defaultBrowserType: "webkit"`. A project that spreads one launches WebKit,
>    which fails in ~3 ms on non-Ubuntu Linux with a missing-libraries error that
>    reads nothing like a test failure. Set `browserName: "chromium"` explicitly.
>
> Usefully, descriptor **viewports are already net of browser chrome** —
> `iPhone 14` is 390×664, `Pixel 7` 412×839. It is StatCounter that reports
> screens; Playwright reports viewports. Do not "correct" 664 up to 844.

### Tier B — nightly / pre-release (~10 min)

- The full `tests/mobile/audit.mjs` sweep: 7 viewports × every route.
- **WebKit** at 390×664 — the closest available Safari proxy (see §4 for the
  caveat, and §3 for the Docker requirement on Linux).
- Firefox at 390×664 — cheap, and it caught the same overflow Chromium masked.
- iPad portrait 810×1080 — one pass, given 0.45% share.
- `tests/mobile/perf-audit.mjs` against the perf budgets above.
- `tests/mobile/overlay-audit.mjs` — every dialog and sheet, at 4 heights.

### Tier C — real devices, before a release or a redesign

Emulation cannot substitute here (§4). Minimum useful set:

1. **A real iPhone, Safari** — for focus-zoom, the collapsing-toolbar dynamic
   viewport, momentum scroll and rubber-banding. ~26% of our mobile users.
2. **A low-end Android** (≤3 GB RAM, e.g. Redmi A-series) on a real mobile
   network, not office wifi. This is the median reader.
3. Optionally one wide-gamut/notched device to check safe-area insets.

If no hardware is to hand: BrowserStack / LambdaTest / Sauce Labs all offer real
device sessions, and Playwright suites run against them with a websocket
endpoint. Remote real-device is still real; emulator farms are not.

---

## 3. Running the tests

### The fast loop

```bash
bun install
bun run dev                              # http://127.0.0.1:40114
```

Then in the browser: **DevTools → Device Toolbar (Ctrl-Shift-M)**, pick
`Responsive`, and type the viewport in by hand. Use **360×640** as your default
working size, not the device presets — the presets are screen sizes (see §1.3).

Set the CPU throttle to **4×** in the Performance panel and leave it there. Most
main-thread regressions are obvious at 4× and invisible at 1×.

### Tier A gates

```bash
# against a running dev server (default baseURL)
bunx playwright test tests/e2e-pw/responsive.mobile.spec.ts

# or against any deployed origin, no local server
E2E_NO_WEBSERVER=1 E2E_BASE_URL=https://jawafdehi.org \
  bunx playwright test tests/e2e-pw/responsive.mobile.spec.ts

# one viewport while iterating
bunx playwright test --project=mobile-floor tests/e2e-pw/responsive.mobile.spec.ts
```

**Checking the gates still bite** — do this whenever you touch them:

```bash
MOBILE_GATES_STRICT=1 E2E_NO_WEBSERVER=1 E2E_BASE_URL=https://jawafdehi.org \
  bunx playwright test --project=mobile-android tests/e2e-pw/responsive.mobile.spec.ts
```

`MOBILE_GATES_STRICT=1` drops every known-defect allowance, so the run **must
fail** on `/report`, `/donate`, the mobile nav and the sub-16 px fields. A strict
run that *passes* means a gate went vacuous — the allowlist is not the only way
to silence one. A green suite is not evidence; a green suite plus a red strict
run is.

### Tier B instruments

Each writes JSON plus screenshots and always exits 0 — they are instruments, not
gates, so they report rather than block.

```bash
node tests/mobile/audit.mjs   --base https://jawafdehi.org --out /tmp/audit
node tests/mobile/perf-audit.mjs --base https://jawafdehi.org --out /tmp/perf
node tests/mobile/overlay-audit.mjs --base https://jawafdehi.org --out /tmp/overlays
node tests/mobile/engine-compare.mjs --base https://jawafdehi.org --out /tmp/engines

# narrow while debugging
node tests/mobile/audit.mjs --device mobile-floor --route donate --shots 0
```

### WebKit on Linux needs Docker

`npx playwright install webkit` downloads a build for **Ubuntu 24.04**. On Amazon
Linux (and most non-Debian distros) it will not launch — it wants `libgtk-4`,
`libicu*.so.74`, `libflite*`, `libavif`, ~20 libraries. Without root, use the
official image, which has them:

```bash
docker run --rm --network host -v "$PWD":/w -w /w \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  node tests/mobile/engine-compare.mjs --base https://jawafdehi.org --out /tmp/engines
```

Keep the tag in step with the `@playwright/test` version in `package.json`.

---

## 4. What emulation cannot catch

Being explicit about this is the point of the tier system. Everything here is
**invisible** to Tier A and Tier B and needs Tier C.

| Not reproducible in Playwright | Why | Cost of missing it |
| --- | --- | --- |
| **iOS focus-zoom on <16 px inputs** | an iOS *UI* behaviour, not a WebKit rendering one — Linux WebKit does not do it | our #1 "feels broken" symptom, ~26% of mobile users |
| **iOS collapsing-toolbar dynamic viewport** | `100vh`/`svh`/`lvh`/`dvh` resolve differently as the toolbar hides | fixed CTAs drift off-screen mid-scroll |
| **Momentum / rubber-band scroll** | native compositor behaviour | scroll-jacking and `overscroll` bugs |
| **Real touch: fat fingers, thumb reach, mis-taps** | a synthetic tap is pixel-perfect; a thumb is ~10 mm | 40 px targets *measure* fine and still get missed |
| **Playwright WebKit ≠ Safari** | same layout engine, different JIT/GC, no iOS platform layer | Safari-only JS timing bugs |
| **Thermal throttling, background app pressure** | a 4× CPU throttle is steady; a real phone degrades | worse-than-measured TBT in the field |
| **Real radio behaviour** | CDP models bandwidth/RTT, not tower handoff or wake-up latency | first-load worse than the 7.9 s measured |
| **Text legibility, actual reading comfort** | no probe judges whether 11 px Devanagari is readable | see below |

**Devanagari deserves its own line.** Nepali is the default language
(`<html lang="ne">`) and Devanagari fails *differently* from Latin at small
sizes: matras and conjuncts collide and stop being distinguishable well before
Latin becomes hard to read. A size that looks acceptable in an English screenshot
can be unreadable in Nepali. So:

- Set floors of **12 px for Latin, 13 px for Devanagari**.
- Review screenshots **in Nepali**, not English. `locale: "ne-NP"` in every
  instrument here does this by default — keep it.
- Nepali strings run longer than their English equivalents. A button that fits in
  English can overflow in Nepali — that is precisely the `/donate` defect. **Test
  the longest locale, not the shortest.**

---

## 5. Writing responsive code here

House conventions, and the traps that actually cost us something.

### Layout

- **Mobile-first.** Unprefixed classes are the phone. `py-16` means *96 px of
  padding on a 360 px phone*; write `py-8 md:py-16`.
- **Breakpoints are the Tailwind defaults** (`sm` 640, `md` 768, `lg` 1024,
  `xl` 1280, `2xl` 1400 — see `tailwind.config.ts`). **There is no breakpoint
  below 640**, so `sm:` is *tablet and up*: every phone gets the base styles.
- Use **`.layout-container`**, never raw `container mx-auto`.
  `tests/layout/page-container.test.ts` enforces this.
- **`min-w-0` on flex and grid children.** A flex/grid item defaults to
  `min-width: auto` = at least min-content, so one unwrappable child widens the
  whole track and the page. This is the `/donate` bug.
- **`overflow-y-auto overscroll-contain` on anything with a fixed height that
  holds a list** — sheets, dialogs, dropdowns, popovers. `h-full` without it is
  how content becomes unreachable.
- **`dvh`, not `vh`,** for full-height panels. `ReportCaseDialog` and
  `UseThisData` already use `h-[calc(100dvh-2rem)]` — copy them.

### Touch

- **44×44 CSS px minimum** for anything tappable. WCAG 2.2 SC 2.5.8 (AA) only
  demands 24×24 and has a spacing exception, so 40 px buttons *conform* and are
  still missed by thumbs — we hold the 44 px line (SC 2.5.5 / Apple HIG).
  `buttonVariants` `size: navMenuIcon` is `h-11 w-11`: the model to follow.
- **Form fields ≥16 px on phones**, or iOS zooms on focus. `.font-input` is the
  single place this is set.
- **No hover-only affordance.** Anything revealed by `:hover` needs a tap or
  focus path. Radix `HoverCard` and bare `title=` are unreachable on touch.
- **Never add `maximum-scale=1` / `user-scalable=no`** to suppress focus-zoom.
  It breaks pinch-zoom for low-vision users. Fix the font size.

### Images

- `srcset` + `sizes` on any content image, or a build-time resize. **No image
  should be more than ~1.2× the CSS box × DPR.**
- `loading="lazy"` on everything below the fold; the LCP image stays eager and
  gets `fetchpriority="high"`.
- WebP/AVIF over PNG for photographs. A 1.67 MB PNG avatar is not a rounding
  error.

### Fonts

- Self-hosted, **WOFF2, subset** to the codepoints used. A brotli'd TTF is not
  equivalent — WOFF2 adds font-specific transforms on top of the same brotli.
- **Preload the primary Devanagari face.** With `font-display: swap`, the swap
  re-renders text and *re-registers LCP* — an unpreloaded body font becomes your
  LCP, which is exactly what happens on the home page today.
- Ship only the weights actually used.

---

## 6. CI

Tier A runs on every PR as the **`phone-gates`** job in `ci.yml`: 4 viewports ×
23 gates = 92, in about 18 s of test time. It is wired deliberately:

- **`bunx vite build`, not `bun run build`.** The full build also runs the
  pre-render and the sitemap, both of which fetch the API — so using it would make
  the job fail whenever the backend is unreachable. The trade-off is that list
  routes are gated in their empty state; layout and reachability still hold.
- **`vite preview` + `E2E_NO_WEBSERVER=1`**, rather than the config's default
  `vite dev` webServer. `preview` serves `dist/client` with SPA fallback, so every
  route resolves without a dev server or an API proxy.
- **Chromium only.** The `mobile-*` projects pin `browserName: "chromium"` on
  purpose (see §3); real WebKit belongs in a slower job.

### Do not put `MOBILE_GATES_STRICT=1` in CI as an inverted assertion

It is tempting to add a step that asserts strict mode *fails*, on the grounds that
a gate which stops failing on a known defect has gone vacuous. Don't wire that
blind:

```yaml
# WRONG — this goes red the day the defects are fixed.
- run: |
    if MOBILE_GATES_STRICT=1 bunx playwright test --project=mobile-android; then
      echo "::error::strict mode passed"; exit 1
    fi
```

The invariant is not "strict must fail" — it is "strict must fail *while
`KNOWN_DEFECTS` is non-empty*". Once the listed defects are fixed and their
entries removed, strict and normal are the same run and both pass, so the step
above would break CI at exactly the moment the code got better.

So strict mode is a **manual** check, run when you add or change a gate:

```bash
MOBILE_GATES_STRICT=1 bunx playwright test --project=mobile-android
```

Expect it to fail on every entry currently in `KNOWN_DEFECTS`, and read the
messages — that is the evidence the gate measures what it claims.

### The other failure mode: an exemption that outlived its bug

Strict mode proves a gate bites *today*. It says nothing about the slower, quieter
failure: a fix lands, nobody trims its `KNOWN_DEFECTS` entry, and because every
allowance is an upper bound the run stays **green** — on a route that now has no
gate at all. Nothing goes red, so nothing tells you.

So each entry asserts its own defect still reproduces. Fix the bug and leave the
entry, and the run fails with `... is STALE: ... Delete the entry`. That turns
each exemption from a standing waiver into a measured claim, and it is why the
overflow entries carry `presentAt` — the widths where the bug was actually seen:

```ts
"/donate": { maxPx: 95, presentAt: [320, 360, 390] },   // and NOT 640: it fits there
```

Listing a width where the bug never happened would fail the staleness check on a
route that was always fine, so `presentAt` has to be measured, not guessed.

This is also what keeps `main` safe when fixes land as separate PRs: CI runs on
`refs/pull/N/merge`, so the PR whose merge would strand an entry goes red on its
own branch first.

### Still open

1. **Delete `test.yml`.** It duplicates `ci.yml` minus the test step, so its name
   implies coverage it does not provide. Left alone here because branch protection
   may reference it by name.
2. **Nightly workflow** for Tier B: the full sweep, WebKit via
   `mcr.microsoft.com/playwright:v1.61.1-noble`, and the perf budgets. Upload
   `findings.json` and the screenshots as artifacts.
3. **A bundle-size gate.** `bun run analyze` already emits the treemap; fail the
   build when any chunk crosses the §1 budget. Worth doing before the font work:
   §1's budget is about total bytes, and total bytes are what bound home LCP.

---

## 7. Reviewer checklist

For any PR that touches layout, a form, an overlay or an image:

- [ ] Viewed at **360×640** and **320×568**, in **Nepali**.
- [ ] Viewed at **640×360** (short) if it added a panel, dialog, sheet or menu —
      *can you still reach the last item and the submit button?*
- [ ] No horizontal scrollbar, **and** `innerWidth` still equals the viewport
      width you set (if it grew, the page is silently zoomed out).
- [ ] Every new tappable thing is ≥44×44.
- [ ] Every new form field is ≥16 px on phones.
- [ ] New images: sized for the box, `loading` set, under 150 KB.
- [ ] New vertical padding scales (`py-8 md:py-16`, not bare `py-16`).
- [ ] New flex/grid children that hold long text have `min-w-0`.
- [ ] Any hover affordance has a tap/focus equivalent.
- [ ] `bunx playwright test tests/e2e-pw/responsive.mobile.spec.ts` is green.

---

## 8. Interpreting a failure

The overflow gate prints an offender list. Read it with two things in mind:

- **Rank by `minContent`, not by `over`.** The cause is the element whose
  min-content width exceeds the viewport; everything downstream of it merely
  inherits the inflated containing block.
- **Ignore `w-full` / `inset-*` elements.** Once the layout viewport is inflated
  by shrink-to-fit, a `w-full` element is *correctly* 100% of an inflated box and
  shows up as an offender without being one. The toast viewport
  (`ol.fixed.top-0…w-full`) appears in every such list and is never the cause.

To find the real culprit interactively:

```bash
node tests/mobile/find-minwidth-culprit.mjs      # walks the tree, measures min-content per node
```

And to check that a proposed fix is actually the fix, rather than a plausible
guess, inject only that declaration into the live page and re-run the failing
assertion — `tests/mobile/verify-nav-fix.mjs` is a worked example of the pattern:
it shows the nav tail unreachable without `overflow-y-auto` and clickable with
it, and nothing else changed.
