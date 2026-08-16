# tests/mobile — phone audit instruments

Measurement tools, **not** gates: each writes JSON + screenshots and exits 0.
The gates live in `tests/e2e-pw/responsive.mobile.spec.ts` and run under the
`mobile-*` Playwright projects.

Read [`docs/testing/mobile-and-responsive-testing.md`](../../docs/testing/mobile-and-responsive-testing.md)
first — it has the device matrix, the budgets, and what emulation cannot catch.

| Script | Answers |
| --- | --- |
| `audit.mjs` | Per (viewport × route): horizontal overflow **and shrink-to-fit zoom-out**, tap-target sizes with the real WCAG 2.5.8 exceptions, sub-16 px form fields, sub-12 px text (flagging Devanagari separately), binding `vh` heights, sticky-chrome cost, obscured anchor targets. Screenshots each page. |
| `overlay-audit.mjs` | For every dialog/sheet at 4 viewport heights: is any content outside the viewport with **no** scroll container able to reach it? |
| `perf-audit.mjs` | FCP / LCP / TBT / CLS and bytes-by-type under 4 CDP throttling profiles (Slow 4G+4×CPU, Fast 4G, 3G+6×CPU, unthrottled). |
| `engine-compare.mjs` | Same viewport across Chromium / WebKit / Firefox. **WebKit needs the Docker image on non-Ubuntu Linux** — see the guideline §3. |
| `lcp-and-images.mjs` | Which element is LCP, and every `<img>`'s intrinsic-vs-rendered size (DPR-aware oversize factor), `srcset`/`loading` presence. |
| `page-weight.mjs` | Total transfer per route **after scrolling to the bottom**, so lazy images are counted. |
| `hero-stats-scroll.mjs` | Drives the home page with real touch flicks and measures the hero stats band: what the **served** markup contains before hydration, whether the CountUp animation is ever on-screen, and the 2×2 grid's real cell geometry. |
| `header-bleed.mjs` | At eight real scroll positions: is the sticky header actually opaque, and how much page text is showing through it? |
| `find-minwidth-culprit.mjs` | Walks the tree measuring `min-content` per node to find what is actually setting an overflow floor. |
| `prove-nav-unreachable.mjs` | Worked example of *proving* a reachability defect: tries wheel, a real `dispatchTouchEvent` drag, mouse drag, Tab-focus-scroll, `scrollIntoView()` and `.click()`, plus a tall-viewport control. |
| `verify-nav-fix.mjs` | Worked example of *proving a fix is causal*: injects only the proposed declaration and re-runs the failing assertion. |

`probe.mjs` holds the shared in-page probe. Its comments record the
false-positive rules that took two passes to get right — read them before
changing a threshold:

- an oversize element is harmless if an ancestor clips or scrolls it;
- a 1×1 / `clip-path: inset(50%)` element is a visually-hidden skip link, not a
  tap target;
- WCAG 2.2 SC 2.5.8 is 24×24 **with** spacing and inline exceptions, so report
  the exception status rather than a bare size;
- **`Input.synthesizeScrollGesture` with `gestureSourceType: "touch"` scrolls
  nothing** in this headless build (0 px, vs 400 px for the same call with the
  default source) — use `Input.dispatchTouchEvent` drags, and assert the gesture
  moved something before concluding anything from it;
- **never trust `window.innerWidth`** — Chromium's mobile emulation inflates it
  to swallow overflow, which is how two broken routes read as clean.

## Usage

```bash
node tests/mobile/audit.mjs --base https://jawafdehi.org --out test-results/mobile/audit
node tests/mobile/audit.mjs --device mobile-floor --route donate --shots 0   # narrow
node tests/mobile/perf-audit.mjs --base https://jawafdehi.org --runs 2
```

Flags: `--base`, `--out`, `--device <id>`, `--route <slug>`, `--shots 0`,
`--interact 0`, `--runs N`. Device ids match the `mobile-*` project names.

All of them set `locale: "ne-NP"` and pre-deny analytics consent
(`jawafdehi_analytics_consent=denied`, per `src/lib/consent.ts`) so the banner
never masks the fold and no beacon is sent while auditing.
