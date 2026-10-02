#!/usr/bin/env node
// SPDX-License-Identifier: Hippocratic-3.0
//
// Initial-payload budget for the client build. Run after `bunx vite build`:
//
//   node scripts/bundle-budget.mjs                 # gate (exit 1 on breach)
//   node scripts/bundle-budget.mjs --report        # print the table, always exit 0
//
// WHAT IT MEASURES, AND WHY THAT AND NOT THE ENTRY CHUNK
//
// The number that bounds first paint is the sum of every JS chunk the browser
// fetches before it can render: the entry chunk PLUS every chunk `index.html`
// references with <script> or <link rel="modulepreload">. Those are the STATIC
// imports. Chunks reached only through a dynamic `import()` are not in it.
//
// This distinction is the whole trap. `manualChunks` splits a static import into
// its own file, which makes the entry chunk look smaller in the build log while
// the browser fetches exactly the same bytes on the same paint. Reading the build
// log's largest number and calling it "the bundle" therefore rewards a change that
// does nothing. Only a dynamic import moves bytes off the critical path.
//
// So: gzip, summed over the statically-reachable set, is the metric. gzip rather
// than raw because that is what crosses the network, and the readers this is for
// are on metered prepaid data (docs/testing/mobile-and-responsive-testing.md §1).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const REPORT_ONLY = args.includes("--report");
const DIR = arg("dir", "dist/client");

// A RATCHET, not an aspiration. It is set just above what the tree currently
// produces, so any change that adds to the initial payload has to either come in
// under it or move the line deliberately.
//
// The GOAL is 350 KB (the JS-transfer budget in
// docs/testing/mobile-and-responsive-testing.md §1). We are a long way over it,
// and the way there is more dynamic imports, not a bigger number here. When you
// take bytes out, ratchet this DOWN in the same commit — a limit left slack after
// a win silently re-permits the regression you just fixed.
//
// 2026-08: briefly raised 660 → 750 for the homepage redesign, then reverted
// after measurement showed the redesign adds only ~2 KB gzip to the initial
// payload (review feedback on PR #359) — the headroom was never needed. The
// lazy-loading rules above still apply unchanged — three.js stays fully
// deferred.
//
// 2026-09: 660_000 → 661_000 for responsive case images (PR #361). Measured,
// not estimated: main built to 659,095 bytes and the branch to 660,016, so the
// feature costs 922 bytes gzip — 0.14% — and left 16 bytes over the old line.
// The whole cost is in the shell (the i18n chunk is byte-identical, and the
// admin widget and the oEmbed card ride their existing lazy chunks).
//
// Taken deliberately rather than trimmed, because the trade runs the right way:
// those 922 bytes are what lets every card and hero serve a width-appropriate
// WebP rendition instead of a full-size original — hundreds of KB of image
// transfer per page against a fraction of one KB of JS. Deduplicating the
// candidate-walk into src/lib/use-case-image.ts was tried first and recovered
// exactly 1 byte: gzip had already collapsed the repeated copy, so there was
// nothing there to win.
//
// The real headroom is elsewhere and is NOT this PR's to spend: `markdown` is
// 100 KB gzip of the initial payload, 15% of the budget, eager only because the
// routes that render it are pre-rendered. Deferring it would pay for this
// change forty times over.
// 2026-09: 661_000 → 657_000. Ratcheted DOWN, per the rule above, in the commit
// that took the bytes out. Adding Instagram and TikTok to the share surfaces put
// the payload 470 bytes OVER the old line, so rather than move the line up, the
// QR encoder came off the critical path: `qrcode.react` was imported at module
// scope by all four share components, two of which live in the eager shell, so
// it shipped on pages that never draw a QR — and in every one of them the code
// only renders inside a dialog or sheet the reader has to open. Routing them
// through src/components/LazyQRCode.tsx recovered 5,603 bytes gzip against the
// two icons' 1,400: 661,470 → 655,941 as built.
//
// The line sits ~1,000 bytes above that, matching the headroom the previous
// entry left. 656_000 was tried and is too tight to be useful: it left 59 bytes,
// so the next incidental change would fail CI for no reason worth stopping on.
//
// 2026-09: 657_000 → 666_500 for the /materials archive landing (PR #353).
// Measured, not estimated: main built to 656,542 bytes and the merged branch to
// 665,403, so the landing costs 8,861 bytes gzip — 1.35%, and 8,403 over the old
// line. Where those bytes are decided whether they could be trimmed:
//
//   ~5,150  MaterialsLanding, FolderCard, the series registry and the JSON-LD
//    2,220  the materialsLanding blocks in en.json and ne.json (10,170 raw)
//    1,491  RecentMaterialsCarousel
//
// Only the last is deferrable, and deferring it was tried and reverted. It buys
// 1,491 of the 8,403 needed and pays for them by dropping the four recently-added
// cards out of the pre-rendered HTML — a cost with no benefit while the other
// 6,912 keep the gate red anyway.
//
// The rest is not deferrable at any price worth paying. It IS the reason
// /materials is pre-rendered: renderToString does not await Suspense (see the
// split policy in src/routes.tsx), so a lazy boundary around the hero, the series
// grid or the JSON-LD would serve the archive's landing page as a fallback with
// no Helmet meta — empty HTML for the one page whose job is to be indexed. The
// translations cannot be deferred at all without splitting the i18n bundle into
// namespaces, which is its own project.
//
// So this one is taken deliberately rather than trimmed, like the responsive
// images above. The line sits ~1,100 bytes over the measured build, matching the
// headroom the entries above leave.
//
// The real headroom is STILL elsewhere and still not this PR's to spend, and it
// has grown: `@sentry-internal/replay` is ~75 KB gzip of the initial payload and
// `markdown` another 100 KB. Either would pay for this change many times over.
//
// 2026-09: 666_500 → 672_500 for the /search material rows (style/materials).
// Measured: main builds to 649.7 KB gzip in CI (646.1 locally — the runner's zlib
// packs ~3.6 KB larger, so the line is judged against CI); this branch builds to
// 652.8 KB locally, ~656.5 KB in CI. What the bytes buy: every material on /search
// renders the same catalogue row as the /materials series pages (MaterialCard),
// with a series for every document and the query highlighted in the fields the
// index does not mark up — plus a search box and collapse on each facet group.
// Deferring the search material card was measured at ~2.5 KB (its body,
// search-highlight and material-series-labels are its only eager consumers)
// and does not cover the gap, because MaterialCard itself stays eager for the
// pre-rendered landing. CI measured the merged branch at 655.7 KB (671,437
// bytes); 672_500 leaves ~1,060 bytes over that, matching the headroom the
// entries above leave.
//
// 2026-09: 672_500 → 678_400 for the donate v2 page (feature/donate-v2).
// /donate is pre-rendered, so its hero, pay card (region tabs, QR switch, bank
// details, remittance expander) and journey board must stay eager (see
// tests/ssr/prerendered-routes-eager.test.ts). The three.js globe is NOT in this
// count — it loads through GlobeGate (client-only, idle-time, WebGL-gated) as a
// deferred chunk. Measured: this branch merged with main builds to 673,756 bytes
// locally; the CI runner's zlib packs ~3.6 KB larger (see the entry above), so
// CI is estimated at ~677,350. 678_400 leaves ~1,050 bytes over that estimate,
// matching the headroom the entries above leave.
//
// 2026-09: 678_400 → 680_300 for the materials tab's two filters
// (feat/material-search-filters). Measured, and this time the local and CI
// figures are the SAME number: main at b1da66c builds to 677,581 bytes gzip
// (CI run 34727712170) and this branch merged with main to 679,225 (CI run
// 34941177606, reproduced byte-for-byte locally), so the pair costs ~1,644
// bytes gzip and lands 825 over the old line. Where they go: the document-type
// facet group with its getFacetItemLabel branch and the ArchiveSearch
// param/pill/clear wiring, the record-date control, lib/date-range's
// parse/normalize/preset rules, and the new archiveSearch.filters keys in
// en.json / ne.json.
//
// Deferring DateRangeFilter was TRIED, MEASURED and REVERTED. It recovers 319
// bytes — not the ~1,600 its source size suggests — against the 825 that had to
// come off, so it cannot clear the gate on its own and would have bought a lazy
// boundary, a chunk fetch on every switch to the materials tab, and a rewrite of
// seven synchronous assertions, AND still needed this line moved. Two things eat
// the difference: lib/date-range stays eager regardless, because
// src/utils/archive-search-params.ts and ArchiveSearch both read
// readDateBounds/describeDateRange on every render, so only the component moves;
// and the dynamic-import stub, the local Suspense boundary and Vite's preload
// entry hand part of it straight back.
//
// Worth recording for whoever needs bytes next, because it is the biggest lever
// measured here in a while: giving BigoRangeFilter the same treatment recovers a
// further 4,031, which would put the payload at 674,875 and let this line
// ratchet DOWN past where it started. It is NOT taken here — that control is not
// this branch's code, it renders on the case tab rather than a type-gated one,
// and it needs its own reserved skeleton and test pass. It is a change on its
// own terms, not a rider on a filter PR.
//
// One correction for the next reader, so the arithmetic above is not misread as
// this branch's doing: the ~1,050 the donate entry claims had ALREADY decayed to
// 819 before this branch touched anything. #393 (launch surfaces, b1da66c) added
// ~2,870 bytes gzip on top of #387 without moving this line — and the ~3.6 KB
// runner-zlib delta that entry leans on did not hold either; local and CI agree
// exactly here. Measure in CI, do not extrapolate. 680_300 leaves ~1,075 bytes
// over the measured build, matching the headroom the entries above leave.
//
// 2026-09: 680_300 → 682_100 for case stages (PR #388). Re-measured after
// merging main at 42c0105, because the figure this branch first carried
// (675_000, against main at 12ac8b5) was measured before #387, #393 and #389
// landed and is meaningless now. Local, same machine, same command for both
// sides: main builds to 679,239 bytes gzip and main+stages to 681,048, so
// stages cost 1,809 bytes — up from the 1,684 measured against the older main,
// because the shell they join grew. Local and CI agree on this file's recent
// history (the entry above reproduced byte-for-byte), and local main here is
// within 14 bytes of the 679,225 CI recorded for 42c0105's branch, so the
// local pair is trustworthy — but re-read the CI number before merging rather
// than trusting this line.
//
// EVERY chunk except the shell is byte-identical — react-vendor, query, i18n
// and markdown all match main to the byte, so the whole 1,809 is index-*.js:
// the stage utils, the card badge logic and the forum-qualified verdict label
// ("विशेष अदालत: सफाइ"), which every card and entity page renders on first
// paint. The new Nepali stage labels cost nothing initial.
//
// Not deferrable. The stage rows land in the shell through CaseDetail, and
// `/case/:id` is pre-rendered, so per the split policy in src/routes.tsx it
// MUST stay eager — renderToString does not await Suspense, and a lazy
// boundary here would serve the one page whose job is to be indexed as a
// fallback with no Helmet meta. `court-case-format` was checked and was
// already eager on main, so nothing was newly dragged in.
//
// So this is taken deliberately, like the three entries above. 682_100 leaves
// ~1,052 bytes over the measured build, matching their headroom. The real
// headroom is still elsewhere and still not this PR's to spend:
// `@sentry-internal/replay` is ~75 KB gzip of the initial payload and
// `markdown` another 98 KB (100,481 bytes, measured here) — either would pay
// for this many times over. The BigoRangeFilter lever noted above (~4,031
// bytes) is still unclaimed and still not this branch's to take.
//
// 2026-09: 682_100 → 683_200. NOT a feature's cost. Two PRs merged 46 seconds
// apart, and the second had measured this line against a main that did not yet
// contain the first. main itself came out RED by 34 bytes at fe5727d. Measured
// locally, one method and one machine, for all four commits in merge order:
//
//   42c0105  #389 materials filters     679,239   limit 680_300   09-15
//   6c863bf  #392 case party cards      679,226   limit 680_300   09-16    −13
//   0b909ad  #382 court case profile    679,903   limit 680_300   03:14:33  +677
//   fe5727d  #388 case stages           682,134   limit 682_100   03:15:19  RED
//
// Note where the line moved and where it did not: #389, #392 and #382 all fit
// UNDER 680_300 and never touched it, so they spent the shared headroom silently
// — #382 took 677 of it and left 397. Only #388 moved the line, and it set
// 682_100 from its own pre-merge pair: main at 42c0105 (679,239) and main+stages
// (681,048), a cost of 1,809 with ~1,052 of headroom over it. Forty-six seconds
// earlier main had become 0b909ad, 664 bytes heavier, and the same stages diff
// lands on that heavier shell for 2,231 rather than 1,809. The extra 422 is
// gzip's cross-term, not new code: the stage labels and the verdict strings
// compress worse against a shell that already carries #382's. So 664 + 422 =
// 1,086 bytes of stacking arrived against 1,052 of headroom, and main came out
// 34 over. (#392 is in the table only to close the arithmetic — it SHRANK the
// payload by 13 bytes and is not part of the breach.)
//
// Every chunk except index-*.js is byte-identical across all four commits
// (markdown 100,481, react-vendor 53,747, query 31,639, i18n 20,448), so the
// whole movement is the shell, exactly as #388's entry says.
//
// 683_200 leaves 1,066 bytes over the measured 682,134, matching the headroom
// the entries above leave. Nothing is trimmed here and nothing should be: no
// feature is added by this commit, and the 34 bytes are not attributable to any
// one PR — each of the three was honestly measured and individually green.
//
// #388's entry ends "re-read the CI number before merging rather than trusting
// this line". That is the step that was skipped, and asking people to remember
// it is not a fix: a per-PR number measured against a fork point cannot catch
// this at all. The check must run against the main a branch will actually merge
// into. Make `Bundle budget` a required status check with the strict
// (up-to-date-with-base) policy — today only `test-and-lint` is required, so
// three branches measured against three different mains were all mergeable
// without ever being rebuilt together.
//
// The real headroom is unchanged and still not this commit's to spend, but the
// biggest lever now has a reason as well as a number, and it is not the reason
// recorded above: BigoRangeFilter is the ONLY consumer of @radix-ui/react-slider
// in the tree (src/components/ui/slider.tsx is its only importer, and that file
// has exactly one importer in turn), so deferring it moves a whole third-party
// package off the critical path rather than component source alone. That is the
// structural difference from the DateRangeFilter attempt, which returned 319 of
// an estimated ~1,600 precisely because lib/date-range stayed eager regardless.
// The blocker recorded above — "it renders on the case tab rather than a
// type-gated one" — does not hold either: the control sits behind
// `selectedType === "case"` and the pre-renderer passes no query string, so it
// is in no pre-rendered HTML. It is still a change on its own terms: it needs a
// reserved skeleton and a pass over the synchronous assertions in the filter
// tests. Taken cleanly on its own branch it should let this line ratchet DOWN
// past where it started.
//
// 2026-09: 683_200 → 679_400. Ratcheted DOWN, per the rule at the top, in the
// commit that takes the bytes out — and the entry above was right that it would
// go past where it started: this is 900 below the 680_300 that stood before #388
// raised it, and the first downward move since the QR encoder came off in #364.
//
// The BigoRangeFilter lever is claimed. Routing it through
// src/components/search/LazyBigoRangeFilter.tsx recovered 3,799 bytes gzip,
// 682,134 → 678,335 as built. That is 232 short of the 4,031 estimated above,
// and the shortfall is the boundary's own cost — a lazy stub, a local Suspense
// node and Vite's preload entry, the same hand-back the DateRangeFilter attempt
// recorded. Measured on the same machine and method as every figure in the entry
// above.
//
// WHY THIS ONE WORKED AND DateRangeFilter DID NOT, stated plainly because the
// materials-filters entry draws the wrong lesson from a sample of one: it is not
// about component size. `BigoRangeFilter` is the sole consumer of
// `@radix-ui/react-slider` in the tree — src/components/ui/slider.tsx is that
// package's only importer, and the filter is slider.tsx's only importer — so the
// boundary moves a whole third-party package off the critical path, and that,
// not the component source, is most of the 3,799. DateRangeFilter had no unique
// dependency: it imports `cn` and lib/date-range, and lib/date-range stays eager
// regardless because archive-search-params and ArchiveSearch both read its
// helpers on every render, so only the component moved. lib/bigo-range stays
// eager here for exactly the same reason and it does not matter — the slider is
// the prize and the slider has nowhere else to be.
//
// Not a waterfall, which is the question worth asking of any deferral: the
// control renders only under `selectedType === "case"`, and /search defaults to
// type=all (utils/archive-search-params rewrites an absent or unknown type to
// `all`, so a fresh search is not scoped to one under-populated type) while
// /materials and /court-cases pin a non-case type. No cold load fetches the
// chunk; the tab click does, which is the LazyQRCode case exactly. Pre-rendering
// is untouched for the same reason — /search and /courtcases ARE pre-rendered,
// but the pre-renderer passes no query string, so this subtree never renders
// into the published HTML and the split policy in src/routes.tsx does not bite.
//
// One thing it needed, and the reason the entry above was right to call it a
// change on its own terms: the rails check is hoisted OUT of the boundary.
// BigoRangeFilter returns null on an extent with no usable rails, which is
// routine — an older cached response predating the extent agg, or a corpus where
// nothing records an amount. Left inside, that becomes ~296px of skeleton that
// resolves to nothing and drops every facet below it. LazyBigoRangeFilter
// therefore runs `hasUsableRails` before the Suspense boundary (free —
// lib/bigo-range is eager anyway), and the reserved skeleton is now one shared
// component so the cold-load sidebar and the chunk fallback cannot drift apart.
// tests/search/SearchFilters.test.tsx keeps the no-extent assertion SYNCHRONOUS
// on purpose: if it ever needs an await, the flash is back.
//
// 679_400 leaves 1,065 bytes over the measured 678,335, matching the headroom
// the entries above leave.
//
// The real headroom is still elsewhere, and two of the three signposts this file
// keeps repeating are wrong, so for whoever needs bytes next: `markdown` is NOT
// eager because its routes are pre-rendered — /case/:id has not been pre-rendered
// since #297 — and `@sentry-internal/replay` is ~39 KB gzip, not the ~75 KB
// recorded above. The largest lever is one this file has never mentioned: en.json
// and ne.json are both statically bundled into index-*.js (~43 KB and ~55 KB
// gzip, essentially no cross-compression), while fallbackLng is `ne`, the
// pre-renderer is hard-coded to `ne`, and English is opt-in and already applied
// asynchronously. Deferring the English bundle is the biggest low-risk win
// available and nobody has taken it.
//
// 2026-09: 679_400 → 681_400 for the agent-readiness layer (structured-data.ts
// and record-head.ts). Re-measured after merging main at f530f50, local, same
// machine, same command for both sides: main builds to 678,335 bytes gzip and
// main+branch to 680,297, so the layer costs 1,962 bytes. Trust the pair: main
// here reproduces the 678,335 the entry above recorded for f530f50 EXACTLY, to
// the byte, so this machine and that measurement agree — but re-read the CI
// number before merging rather than trusting this line.
//
// All 1,962 bytes are the shell. The other four initial chunks are byte-identical
// across the pair — markdown, react-vendor, query and i18n keep the same content
// hashes on both sides, which is a stronger check than comparing sizes — so the
// whole delta is index-*.js: the JSON-LD graph builders, the schema.org @type
// sanitiser, the og:type mapper and the two head mappers the Worker and the pages
// share.
//
// Not deferrable WITHOUT giving up what the layer is for. The builders reach the
// shell through CaseDetail (record-head) and EntityProfile (structured-data),
// both eager in src/routes.tsx. Note this is NOT the pre-render argument an entry
// above makes: /case/:id has not been pre-rendered since #297, so eagerness there
// is a standing routing choice, not a constraint this branch inherits. The real
// blocker is head parity. The edge Worker and the hydrated page run the SAME
// mapper so an agent and a reader cannot be told different things about one
// record, and tests/ssr/worker.head-drift.test.ts pins it; a lazy boundary around
// the mapper would reintroduce exactly the divergence this branch removed. Paying
// ~1.9 KB for the whole machine-readability layer is the trade, and it is a good
// one — but if bytes get tight, the en.json lever above is worth 20x this and is
// still untaken.
const MAX_INITIAL_JS_GZIP = 681_400;
const GOAL_INITIAL_JS_GZIP = 350_000;

// Packages that must not be in the initial payload, with a marker string that
// survives minification.
//
// Each entry is self-checking: the marker must be ABSENT from every initial chunk
// and PRESENT in at least one deferred chunk. That second half is the point — a
// marker that stops appearing anywhere (renamed export, dropped dependency, a
// minifier that mangles it) would otherwise make this check pass vacuously
// forever, which is a worse failure than the regression it is meant to catch.
const MUST_BE_DEFERRED = [
  {
    marker: "recharts",
    why:
      "recharts + lodash + decimal.js-light + react-smooth were 110 KB gzip of " +
      "the initial payload because ResearchCorruption (pre-rendered, therefore " +
      "eagerly imported) imported the charts directly. Load them through " +
      "lazyChart() in src/components/charts/lazy.tsx.",
  },
  {
    marker: "THREE.WebGLRenderer",
    why:
      "three.js + @react-three/fiber are ~250 KB gzip and the homepage hero " +
      "scene is the only consumer. The initial payload sits ~1 KB under the " +
      "limit, so a single static import of the 3D stack blows the budget. " +
      "Load it only through the React.lazy() dynamic import in " +
      "src/components/home/hero-scene-gate.tsx.",
  },
];

const gz = (buf) => zlib.gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const htmlPath = path.join(DIR, "index.html");
if (!fs.existsSync(htmlPath)) {
  console.error(`no build at ${htmlPath} — run \`bunx vite build\` first`);
  process.exit(2);
}
const html = fs.readFileSync(htmlPath, "utf8");

// <script src> and <link rel="modulepreload" href> are exactly the statically
// reachable set: Vite emits a modulepreload for every static import of the entry.
const initial = [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]))];
if (initial.length === 0) {
  console.error("parsed 0 initial JS chunks from index.html — the markup shape changed, so this gate is blind. Fix the parser before trusting a pass.");
  process.exit(2);
}

const all = fs
  .readdirSync(path.join(DIR, "assets"))
  .filter((f) => f.endsWith(".js"))
  .map((f) => `/assets/${f}`);
const deferred = all.filter((f) => !initial.includes(f));

const read = (f) => fs.readFileSync(path.join(DIR, f.replace(/^\//, "")));
const rows = initial
  .map((f) => ({ f, raw: read(f).length, gzip: gz(read(f)) }))
  .sort((a, b) => b.gzip - a.gzip);
const totalGzip = rows.reduce((s, r) => s + r.gzip, 0);
const totalRaw = rows.reduce((s, r) => s + r.raw, 0);

console.log(`Initial JS — ${rows.length} chunk(s) fetched before first paint\n`);
for (const r of rows) {
  console.log(`  ${path.basename(r.f).padEnd(44)} ${kb(r.raw).padStart(10)} raw ${kb(r.gzip).padStart(10)} gzip`);
}
console.log(`  ${"TOTAL".padEnd(44)} ${kb(totalRaw).padStart(10)} raw ${kb(totalGzip).padStart(10)} gzip`);
console.log(
  `\n  limit ${kb(MAX_INITIAL_JS_GZIP)} · goal ${kb(GOAL_INITIAL_JS_GZIP)} · ` +
    `deferred (not counted): ${deferred.length} chunk(s), ${kb(deferred.reduce((s, f) => s + gz(read(f)), 0))} gzip`,
);

const failures = [];
if (totalGzip > MAX_INITIAL_JS_GZIP) {
  failures.push(
    `initial JS is ${kb(totalGzip)} gzip, over the ${kb(MAX_INITIAL_JS_GZIP)} limit by ${kb(totalGzip - MAX_INITIAL_JS_GZIP)}.\n` +
      `    Find the new static import: build with ANALYZE=true and read dist/stats.html,\n` +
      `    or see docs/testing/bundle-and-code-splitting.md for the method.`,
  );
}

for (const { marker, why } of MUST_BE_DEFERRED) {
  const inInitial = initial.filter((f) => read(f).includes(marker));
  const inDeferred = deferred.filter((f) => read(f).includes(marker));
  if (inInitial.length) {
    failures.push(
      `"${marker}" is in the INITIAL payload (${inInitial.map((f) => path.basename(f)).join(", ")}).\n    ${why}`,
    );
  } else if (inDeferred.length === 0) {
    failures.push(
      `"${marker}" appears in NO chunk at all, initial or deferred. This check can no\n` +
        `    longer detect anything, so it is now a vacuous pass rather than a guarantee.\n` +
        `    Either the dependency is gone (delete this entry) or the marker rotted\n` +
        `    (pick a new one and verify it appears in the deferred chunk).`,
    );
  }
}

if (failures.length && !REPORT_ONLY) {
  console.error(`\n${failures.length} budget failure(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
if (failures.length) {
  console.log(`\n(${failures.length} failure(s), not enforced because --report was passed)`);
}
console.log("\n✓ within budget");
