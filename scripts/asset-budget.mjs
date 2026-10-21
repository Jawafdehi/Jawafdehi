#!/usr/bin/env node
// SPDX-License-Identifier: Hippocratic-3.0
//
// File-count budget for the Worker's static assets. Run after the pre-render:
//
//   node scripts/asset-budget.mjs              # gate (exit 1 over budget)
//   node scripts/asset-budget.mjs --report     # print the table, always exit 0
//
// WHY A FILE COUNT, AND WHY IT IS A GATE
//
// Cloudflare caps a Worker version at 20,000 static asset FILES (100,000 on
// Workers Paid). Every pre-rendered page is one file, so the count tracks the
// corpus, and the corpus moves in bulk imports: case pages went from ~463 on
// 2026-10-03 to 2,629 by 2026-10-19.
//
// The limit has been crossed once already. The failure mode is the reason this
// script is a gate and not a log line: the deploy is rejected with error 10304
// DAYS after the publishing that caused it, nothing in GitHub reports it —
// Cloudflare posts no check for the production deploy, only for PR previews —
// and production silently keeps serving the previous bundle. A red build is a
// strictly better way to find out.
//
// WHAT IT COUNTS
//
// Only what wrangler would actually upload: every file under `dist/`, minus
// anything `dist/.assetsignore` excludes (see writeAssetsIgnore in
// scripts/pre-render.ts). Counting the raw tree instead would over-report by
// ~160 and make the budget meaningless in the direction that matters.
//
// The ignore matching here is deliberately literal — directory prefixes and
// exact names, which is all .assetsignore is used for in this repo. It is not a
// general .gitignore engine, and it should fail loudly rather than silently
// under-count if that file ever grows globs.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const REPORT_ONLY = process.argv.includes("--report");

// 20,000 is the hard Free-plan ceiling; 18,000 leaves ~2,000 pages of warning.
// Raise via the env var — on Workers Paid the ceiling is 100,000, so 90,000.
const MAX = Number(process.env.ASSET_BUDGET_MAX ?? 18_000);
if (!Number.isInteger(MAX) || MAX < 1) {
  console.error(
    `[asset-budget] ERROR: ASSET_BUDGET_MAX must be a positive integer, got ${JSON.stringify(
      process.env.ASSET_BUDGET_MAX,
    )}.`,
  );
  process.exit(1);
}

if (!fs.existsSync(DIST)) {
  console.error("[asset-budget] ERROR: dist/ does not exist. Run the build first.");
  process.exit(1);
}

/** Literal rules from .assetsignore: `/dir/` prefixes and bare filenames. */
function readIgnoreRules() {
  const file = path.join(DIST, ".assetsignore");
  if (!fs.existsSync(file)) {
    console.warn(
      "[asset-budget] WARNING: no dist/.assetsignore — counting the whole tree.\n" +
        "  pre-render.ts writes it; if it is missing, build intermediates are being published.",
    );
    return { dirs: [], files: [] };
  }
  const dirs = [];
  const files = [];
  for (const raw of fs.readFileSync(file, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/[*?[\]!]/.test(line)) {
      console.error(
        `[asset-budget] ERROR: .assetsignore line ${JSON.stringify(line)} uses glob syntax,\n` +
          "  which this script does not implement. It would under-count the upload and let a\n" +
          "  deploy cross the limit unnoticed. Teach this script the pattern, or keep the file literal.",
      );
      process.exit(1);
    }
    if (line.endsWith("/")) dirs.push(line.replace(/^\/|\/$/g, ""));
    else files.push(line.replace(/^\//, ""));
  }
  return { dirs, files };
}

const { dirs: ignoredDirs, files: ignoredFiles } = readIgnoreRules();

/** Count files per top-level entry of dist/, honouring the ignore rules. */
function walk(dir, relBase = "") {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (ignoredDirs.includes(rel)) continue;
      total += walk(path.join(dir, entry.name), rel);
    } else if (!ignoredFiles.includes(rel)) {
      total += 1;
    }
  }
  return total;
}

const breakdown = [];
let uploaded = 0;
for (const entry of fs.readdirSync(DIST, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    if (ignoredDirs.includes(entry.name)) {
      breakdown.push([`${entry.name}/`, "ignored"]);
      continue;
    }
    const n = walk(path.join(DIST, entry.name), entry.name);
    breakdown.push([`${entry.name}/`, n]);
    uploaded += n;
  } else if (!ignoredFiles.includes(entry.name)) {
    uploaded += 1;
  }
}
const rootFiles = uploaded - breakdown.reduce((a, [, n]) => a + (typeof n === "number" ? n : 0), 0);
breakdown.push(["(root files)", rootFiles]);
breakdown.sort((a, b) => (typeof b[1] === "number" ? b[1] : -1) - (typeof a[1] === "number" ? a[1] : -1));

console.log("[asset-budget] files wrangler would upload, by top-level entry:");
for (const [name, n] of breakdown) console.log(`  ${String(n).padStart(7)}  ${name}`);
console.log(`[asset-budget] total ${uploaded} of ${MAX} budgeted (hard limit 20,000 on Workers Free).`);

if (uploaded > MAX && !REPORT_ONLY) {
  console.error(
    `\n[asset-budget] ERROR: ${uploaded} asset files exceeds the budget of ${MAX}.\n` +
      "  Cloudflare rejects a Worker version over 20,000 files, and that rejection surfaces\n" +
      "  days later as a production frozen on an old bundle, with no failing check anywhere.\n" +
      "  Options, in order of preference:\n" +
      "    1. Lower PRERENDER_ENTITY_LIMIT (currently the largest single contributor).\n" +
      "    2. Move to Workers Paid (100,000 files) and set ASSET_BUDGET_MAX=90000.\n" +
      "    3. If you are certain this deploy is safe: ASSET_BUDGET_MAX=<n> to override.\n",
  );
  process.exit(1);
}

if (uploaded > MAX) {
  console.warn(`[asset-budget] over budget by ${uploaded - MAX}, but --report was passed.`);
}
