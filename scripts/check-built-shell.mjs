#!/usr/bin/env node
// SPDX-License-Identifier: Hippocratic-3.0
//
// The tripwire for tests/ssr/worker.head-hygiene.test.ts.
//
// worker.ts builds a record's head by STRIPPING the shell's own head tags and
// appending its own, so every one of those tests runs against a hand-written SHELL
// constant that stands in for the real `dist/index.html`. The moment the build
// stops emitting a head that fixture resembles — helmet drops its `data-rh`
// attribute, the site-level ld+json moves, the module entry doubles — those tests
// keep passing while the Worker they model has started producing duplicate
// canonicals in production. So the fixture's own likeness has to be checked, and
// checked against the artifact, not against another fixture.
//
// It lives HERE, and not in the vitest suite, because it cannot work there: CI runs
// `bun run test` BEFORE `bun run build`, so `dist/` does not exist yet. It was in
// the suite, wrapped in `try { … } catch { return }` for exactly that reason, which
// made it a test that could not fail and reported the invariant as held everywhere.
//
// Run after the FULL build (`bun run build`), not after `bunx vite build`: the
// shell this checks is the PRE-RENDERED homepage that scripts/pre-render.ts writes
// over the template. Against the bare vite output it would read helmet
// placeholders and legitimately fail.
import fs from "node:fs";
import path from "node:path";

const HTML = path.join(process.cwd(), "dist", "index.html");

if (!fs.existsSync(HTML)) {
  console.error(
    `no built shell at ${HTML}.\n` +
      `    This gate runs after the full build — \`bun run build\` — because the shell it\n` +
      `    checks is the pre-rendered homepage, not the vite template.`,
  );
  process.exit(2);
}

const built = fs.readFileSync(HTML, "utf8");
const headEnd = built.indexOf("</head>");
const head = headEnd === -1 ? "" : built.slice(0, headEnd);

const count = (haystack, re) => (haystack.match(re) ?? []).length;

const failures = [];

// react-helmet-async marks every tag it owns. The strip regexes in worker.ts are
// written against that shape, and the head-hygiene SHELL constant carries it.
if (!head.includes('data-rh="true"')) {
  failures.push(
    'the head carries no `data-rh="true"` attribute.\n' +
      "    react-helmet-async marks its own tags with it, and tests/ssr/worker.head-hygiene.test.ts\n" +
      "    models the shell that way. If helmet stopped emitting it (or was replaced), the\n" +
      "    Worker's strip step is now matching a shape the build no longer produces.",
  );
}

// Exactly one site-level graph. Two would mean the Worker's ld+json strip leaves a
// second, irrelevant graph riding along on every case and entity URL.
const graphs = count(head, /application\/ld\+json/g);
if (graphs !== 1) {
  failures.push(
    `the head has ${graphs} ld+json node(s), expected exactly 1 (the site-level WebSite graph).\n` +
      "    worker.ts strips this one and injects the record's own; more than one here means the\n" +
      "    strip leaves a competing graph behind, and none means the site node has gone.",
  );
}

const entries = count(head, /<script type="module"/g);
if (entries !== 1) {
  failures.push(
    `the head has ${entries} module entry script(s), expected exactly 1.\n` +
      "    The Worker appends to this head; a second entry would run the app twice.",
  );
}

// The dehydrated query state is what makes a pre-rendered page hydrate without
// re-fetching. Its absence means pre-render published a shell with no data.
if (!built.includes("__REACT_QUERY_STATE__")) {
  failures.push(
    "the built page carries no __REACT_QUERY_STATE__ script.\n" +
      "    scripts/pre-render.ts injects it; without it every pre-rendered page re-fetches on\n" +
      "    hydration and the head-hygiene fixture no longer resembles the artifact.",
  );
}

if (failures.length) {
  console.error(`\n${failures.length} built-shell failure(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log("✓ built shell matches the head-hygiene fixture's assumptions");
