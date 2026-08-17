#!/usr/bin/env node
// SPDX-License-Identifier: Hippocratic-3.0
//
// Check a perf-audit run against the §1 budgets in
// docs/testing/mobile-and-responsive-testing.md.
//
//   node tests/mobile/perf-audit.mjs --base https://jawafdehi.org --out /tmp/perf
//   node scripts/perf-budget.mjs --in /tmp/perf/perf.json
//
// `perf-audit.mjs` is an INSTRUMENT: it always exits 0, because a measurement that
// refuses to report is useless. This is the gate half, kept separate so the same
// measurement can be read either way.
//
// Only the throttled profile is judged. The budgets are stated for Slow 4G + 4×
// CPU, so scoring an unthrottled run against them would pass everything and mean
// nothing — the commonest way a perf gate goes quietly vacuous. If the named
// profile is absent from the file, that is a hard error, NOT a pass: a rename
// upstream must not silently turn this into a no-op.
import fs from "node:fs";

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};
const IN = arg("in", "test-results/mobile/perf/perf.json");
// Substring, because the instrument's label carries the numbers with it.
const PROFILE = arg("profile", "Slow 4G");
const WARN_ONLY = args.includes("--warn-only");

// From §1. Each is "Google good" or better, and each was breached at the time it
// was written — these are targets we are climbing to, not a description of today,
// so expect this gate to be red until the work lands. Run it with --warn-only
// while that is true; drop the flag when it passes, and never relax a number to
// make it pass.
const BUDGETS = [
  { key: "lcp", label: "LCP", max: 2500, unit: "ms" },
  { key: "tbt", label: "TBT", max: 300, unit: "ms" },
  { key: "cls", label: "CLS", max: 0.05, unit: "" },
  { key: "totalEncodedBytes", label: "transfer", max: 800 * 1024, unit: "B" },
];

if (!fs.existsSync(IN)) {
  console.error(`no perf run at ${IN} — run tests/mobile/perf-audit.mjs first`);
  process.exit(2);
}
const { base, generatedAt, rows } = JSON.parse(fs.readFileSync(IN, "utf8"));
const judged = rows.filter((r) => String(r.profile).includes(PROFILE) && !r.error);

if (judged.length === 0) {
  console.error(
    `0 rows matched profile "${PROFILE}" in ${IN}.\n` +
      `Profiles present: ${[...new Set(rows.map((r) => r.profile))].join(" | ")}\n` +
      `Refusing to report a pass: an empty selection would score nothing and look green.`,
  );
  process.exit(2);
}

// Worst run per route, not the mean. A budget is a promise about what a reader
// gets, and averaging hides the slow load that made them leave.
const worst = new Map();
for (const r of judged) {
  const cur = worst.get(r.slug);
  if (!cur || (r.lcp ?? 0) > (cur.lcp ?? 0)) worst.set(r.slug, r);
}

console.log(`perf budget — ${base} @ ${generatedAt}`);
console.log(`profile "${PROFILE}", ${judged.length} run(s) over ${worst.size} route(s), worst per route\n`);

const failures = [];
const fmt = (v, unit) => (unit === "B" ? `${(v / 1024).toFixed(0)} KB` : `${v}${unit}`);
for (const [slug, r] of [...worst].sort()) {
  const parts = [];
  for (const b of BUDGETS) {
    const v = r[b.key];
    if (v === undefined || v === null) {
      parts.push(`${b.label}=n/a`);
      continue;
    }
    const over = v > b.max;
    parts.push(`${b.label}=${fmt(v, b.unit)}${over ? "!" : ""}`);
    if (over) failures.push(`${slug}: ${b.label} ${fmt(v, b.unit)} > ${fmt(b.max, b.unit)}`);
  }
  console.log(`  ${slug.padEnd(16)} ${parts.join("  ")}`);
}

if (failures.length === 0) {
  console.log("\n✓ every route within every budget");
  process.exit(0);
}
console.log(`\n${failures.length} breach(es):`);
for (const f of failures) console.log(`  ✗ ${f}`);
if (WARN_ONLY) {
  console.log("\n(--warn-only: reporting, not failing)");
  process.exit(0);
}
process.exit(1);
