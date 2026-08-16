# Bundle size and code splitting

How to measure what this app ships on first paint, what is currently in it, and the
three traps that make the obvious measurement wrong.

Companion to [`mobile-and-responsive-testing.md`](./mobile-and-responsive-testing.md),
whose §1 sets the budget this is measured against: **JS transfer ≤ 350 KB gzip**.

---

## 1. Measure the initial payload, not the entry chunk

The number that bounds first paint is the sum of every JS chunk the browser must
fetch before it can render: the entry chunk **plus** every chunk `index.html`
references with `<script>` or `<link rel="modulepreload">`. Those are the static
imports. Chunks reached only through a dynamic `import()` are not in it.

```bash
bunx vite build
node scripts/bundle-budget.mjs           # the gate; --report to print and not fail
```

**As of 2026-08-16, after the split below:**

| | raw | gzip |
| --- | --- | --- |
| Initial JS (5 chunks) | 2,135.6 KB | **635.5 KB** |
| — before the split | 2,573.2 KB | 745.7 KB |
| Deferred (26 chunks, not counted) | — | 660.6 KB |
| Budget (§1) | — | 350 KB |

So we are still **1.8× over budget**, and §4 lists what is left.

### 🛑 Trap 1 — `manualChunks` moves a number, not any bytes

The build log's biggest line is the entry chunk, and shrinking it feels like
progress. Adding a package to `manualChunks` does shrink it — and changes the
initial payload by **zero**, because a static import is still a static import and
the browser still fetches it on the same paint. All it does is split one file into
two.

Only a **dynamic** `import()` moves bytes off the critical path. Anything else is
bookkeeping. This is why `scripts/bundle-budget.mjs` sums the statically-reachable
set instead of reading the largest chunk.

`manualChunks` is still worth having for **cache** reasons — `react-vendor` moving
independently of app code means an app-code deploy does not invalidate React — but
that is a different benefit, and it is not a size win.

### 🛑 Trap 2 — a shared module gets hoisted to the common ancestor

Rollup places a module in a chunk reachable from everything that needs it. So a
package imported by **one eager page and one lazy page** ends up in the chunk they
share — the entry — and the lazy page's own chunk looks reassuringly small while
its dependency ships to everybody.

That is exactly what happened here: `/data-quality` is `lazy()` and its chunk was
**9 KB gzip**, because recharts had been hoisted into the entry by the *other*
importer. A small lazy chunk is not evidence that its dependencies are deferred.

To find the real culprit, attribute the entry chunk by package:

```bash
ANALYZE=true bunx vite build      # writes dist/stats.html (rollup-plugin-visualizer)
```

Then read the treemap, or parse the JSON embedded in that file and walk
`nodeMetas[uid].importedBy` until you reach a `src/` module — that gives you the
*application* file responsible, which is the thing you can actually change.

⚠️ The per-module `gzipLength` in that data is the gzip of each module **in
isolation**, and summing it overstates the real total (gzip compresses better
across a whole file: the parts of the entry chunk sum to 1,203 KB against 563 KB on
disk). Use it for **relative shares**, and `scripts/bundle-budget.mjs` for totals.

---

## 2. What is in the initial payload, and why

Pre-rendering is the constraint behind most of it. There is no runtime SSR: HTML is
produced at build time by `scripts/pre-render.ts`, and React 18's `renderToString`
does not await `React.lazy`. So **every pre-rendered route must be imported
eagerly** (the policy is stated in `src/routes.tsx`), and everything those pages
import comes with them.

That policy is correct and is not the problem. The problem is that "this page must
be eager" was read as "everything it renders must be eager", which does not follow.

---

## 3. The recharts split — the worked example

**Finding.** `recharts` and the deps only it pulls in were the biggest removable
item in the initial payload, on every route, for every visitor. Ranked by the
analyzer's rendered bytes:

| package | share of entry chunk (rendered) |
| --- | --- |
| `recharts` | 629,836 B |
| `lodash` (via recharts) | 154,285 B |
| `decimal.js-light` | 49,577 B |
| `react-smooth` | 38,618 B |

It had exactly **one** eager entry point: `src/pages/ResearchCorruption.tsx`, which
is pre-rendered and imported the chart components directly. `/data-quality`, the
only other consumer, was already lazy.

**Why deferring it was free.** Every one of those charts already rendered nothing
but a correctly-sized placeholder until a mount effect fired — see
`src/hooks/useMounted.ts`, which exists because recharts' `ResponsiveContainer`
measures the DOM and has no stable SSR result. **No chart markup had ever been in
the pre-rendered HTML.** So moving the import behind a boundary whose fallback is
that same placeholder changes nothing a reader or a crawler can see.

**How.** `src/components/charts/lazy.tsx` exports `lazyChart(load, placeholder)`.
`ResearchCorruption.tsx` wraps six charts with it. `ChargeMixByYear` is the
exception: it renders a percent toggle, a colour legend, and a `role="img"` whose
`aria-label` spells out every year's figures as text, all before mount — so only
its recharts subtree moved, into `ChargeMixByYearBars.tsx`, with the shared
constants in `charge-mix-series.ts` to avoid a parent↔child cycle.

**Result:** initial JS **745.7 → 635.5 KB gzip (−110 KB, −14.8%)**, with all 22
pre-rendered pages byte-identical (§5).

### 🛑 Trap 3 — `renderToString` marks a Suspense boundary FAILED, and the page still looks right

The first version of `lazyChart` rendered `<Suspense fallback={…}><Lazy/></Suspense>`
unconditionally. The build succeeded. `pre-render` logged **✓** for every route.
The placeholders were present in the HTML. It was still broken.

React 18's `renderToString` does not support Suspense. It emits the fallback — which
is why this survives a glance — wrapped in a **failed**-boundary marker
(`<!--$!-->`, not `<!--$-->`) preceded by:

```html
<template data-msg="The server did not finish this Suspense boundary: The server
used &quot;renderToString&quot; which does not support Suspense…"
          data-stck="&#10;    at Suspense&#10;    at LazyChart&#10;    at abort
(/paperspace/volunteer/work/2026-08-16-fe-bundle/node_modules/react-dom/…)">
```

Two problems, neither visible in the build output:

1. **Absolute build-machine paths ship inside a public static file.** Measured on
   `/research/corruption-accountability`: **177 extra lines, 14 stack traces.**
2. The failed marker tells React at hydration that the server did not complete that
   boundary, so it discards the server markup for the subtree and re-renders it.

**The fix.** Two options, and the second is better:

1. *Gate the boundary on mount* — keep `Suspense`, but wrap it in a `useMounted()`
   check so the server never reaches it. Works, and leaves a load-bearing line that
   looks redundant (`Suspense` already has a `fallback`), so someone will delete it.
2. *Do not use `Suspense` at all* — load in an effect and hold the component in
   state. There is no boundary, so there is nothing to fail. This is what
   `lazyChart` does.

The second also fails better: if the chunk never arrives the placeholder simply
stays, whereas a rejected `React.lazy` throws to the nearest error boundary and
takes the whole page with it. On a reading-heavy site a missing chart beats a blank
page.

🛑 **If you write the effect version, wrap the component in a thunk in both
places.** A component *is* a function, and React overloads functions in both state
positions: `useState(fn)` treats `fn` as a lazy initialiser and calls it with no
arguments, `setState(fn)` treats it as an updater and calls it with the previous
state. Either way React invokes your chart as a plain function. Measured:
`TypeError: Cannot destructure property 'height' of 'object null'` — the chart
rendered with `props === null`. Write `useState(() => Component)` and
`setState(() => Component)`.

**Generalise the whole thing:** on a pre-rendered route, a `Suspense` boundary that
can actually suspend during pre-render is a bug, no matter how good the fallback is.
Either keep the import eager, or defer it without a boundary.

`tests/ssr/lazy-chart.test.tsx` pins both halves — the server output *and* that the
chart still actually arrives on the client, without which the server assertions
would be satisfied by a component that renders a placeholder forever — plus a
positive control that fails loudly if a React upgrade ever makes `renderToString`
handle Suspense.

---

## 4. What is still in there

Measured shares of the entry chunk (rendered bytes; see the §1 caveat about
summing per-module gzip). None of these is done — each is a decision, not an
oversight.

| What | rendered | The trade-off |
| --- | --- | --- |
| **Sentry** — `replay` 320 KB + `core` 271 KB + `browser-utils` 98 KB + `browser` 82 KB | **771 KB** | The biggest single item by far. Session Replay is deliberately configured error-only (`replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`, `src/lib/sentry.ts`), and error-only replay works by buffering continuously *before* the error — so lazy-loading it after first paint loses the buffer that makes it useful. Deferring the whole SDK loses errors during initial load, which is when they matter most. **A judgement call for whoever owns error monitoring, not a mechanical fix.** |
| **`oidc-client-ts`** | 121 KB | In the public entry chunk via `src/services/http.ts:20`, which statically imports `getAccessToken` so the shared axios interceptor can attach a bearer token to **every** request, including anonymous ones. Not `/admin`'s fault: `AdminApp` is correctly lazy at 379 KB gzip. Deferring it means splitting `services/oidc.ts` into a thin token reader plus a lazily-imported `UserManager`, and checking `localStorage` for a session *before* loading the library at all — so anonymous readers, the overwhelming majority, never fetch it. That touches the auth path on every request and deserves its own PR and its own tests. |
| **`dompurify`** | 108 KB | Reached from `src/components/StreamField.tsx`. Sanitisation on a corruption archive is not optional; the question is only whether the pages that need it are eager. |
| **`date-fns` + `date-fns-tz`** | 152 KB | Three entry points: `src/utils/date.ts`, `ui/calendar.tsx`, `admin/ADDatePicker.tsx`. 824 modules in the graph suggests wide barrel imports; narrowing to per-function imports is low-risk and probably worth more than it looks. |
| **`tailwind-merge`** | 72 KB | `cn()` is used by every component, so this is genuinely shared. Not a candidate. |
| **`qrcode.react`** | 45 KB | Only the donate/share QR codes (`FloatingShareSidebar`, `case-detail/mobile-share-expander`). A share sheet is interaction-triggered, so this is a good `lazyChart`-shaped candidate. |
| **`lucide-react`** | 41 KB | Already per-icon imports; the cost is the number of distinct icons, not the library. |

`src/components/ui/chart.tsx` is **dead code** — nothing imports it — and it
imports recharts. It contributes **0 bytes** today because rollup tree-shakes it
out, so deleting it is hygiene, not a size win. Worth doing so a future recharts
audit does not chase it.

---

## 5. Proving a split changed no HTML

A splitting change is only safe if the pre-rendered output is unchanged, and the
build will not tell you (§3 trap). Diff it:

```bash
# control
git worktree add --detach /tmp/ctrl origin/main
cd /tmp/ctrl && bun install && bun run build

# your branch
cd - && bun run build
```

Then compare every pre-rendered page, normalising the two things that legitimately
differ between builds:

- **asset hashes** — content hashes change whenever chunking changes, by design;
- **`<script id="__REACT_QUERY_STATE__">`** — the dehydrated payload is fetched
  live from the API at build time, so two builds minutes apart differ in the data
  itself, not just a timestamp.

Anything left is your change. For the recharts split: **22 pre-rendered pages, 22
identical, 0 differing**, and `/research/corruption-accountability` byte-identical
at 80,708 chars.

⚠️ `bun run build` needs `api.jawafdehi.org` reachable (public reads, no
credential). `bunx vite build` alone does not, but it also does not pre-render, so
it cannot answer this question.

---

## 6. The gates

| Gate | Where | Enforced? |
| --- | --- | --- |
| Initial JS ≤ 660 KB gzip, and `recharts` absent from it | `bundle-budget` job in `ci.yml` | **yes**, on every PR |
| LCP / TBT / CLS / transfer vs §1 | `perf` job in `nightly.yml` | **no** — `--warn-only` |

The bundle limit is a **ratchet set just above today's number**, not a target. When
you take bytes out, lower it in the same commit: a limit left slack after a win
silently re-permits the regression you just fixed.

The perf budgets are report-only on purpose. As of 2026-08-16 production breaches
**12 of 20** — home LCP **8,224 ms** on Slow 4G against a 2,500 ms budget — so
enforcing would paint every night red and teach everyone to ignore it. Flip
`enforce_perf` when the numbers are close. **Do not raise a budget to make it
pass.**

Both gates are built to fail rather than pass when they cannot measure: the bundle
gate errors if it parses zero chunks from `index.html`, its `recharts` check fails
if the marker appears in *no* chunk (a rotted marker would otherwise pass forever),
and `perf-budget.mjs` exits non-zero if the throttled profile it is told to judge
is not in the file. A gate that cannot see anything must not report success.
