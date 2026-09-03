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
// 2026-09: 661_000 → 656_000. Ratcheted DOWN, per the rule above, in the commit
// that took the bytes out. Adding Instagram and TikTok to the share surfaces put
// the payload 470 bytes OVER the old line, so rather than move the line up, the
// QR encoder came off the critical path: `qrcode.react` was imported at module
// scope by all four share components, two of which live in the eager shell, so
// it shipped on pages that never draw a QR — and in every one of them the code
// only renders inside a dialog or sheet the reader has to open. Routing them
// through src/components/LazyQRCode.tsx recovered 5,603 bytes gzip against the
// two icons' 1,400, measured: 661,470 → 655,867.
const MAX_INITIAL_JS_GZIP = 656_000;
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
