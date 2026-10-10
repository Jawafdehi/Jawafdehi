import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, it, expect } from "vitest";

/**
 * No regex lookbehind anywhere in src/.
 *
 * Lookbehind is a PARSE-time SyntaxError on Safari < 16.4 and iOS < 16.4, and a
 * regex literal is parsed when its module is parsed — so one lookbehind takes
 * down the whole chunk, not just the feature using it. That is a blank page,
 * not a missing detail.
 *
 * This cannot be a behavioural test. The runner's engine supports lookbehind
 * perfectly well, so every behavioural case stays green while real iOS users
 * get nothing.
 *
 * It lives in its own file ON PURPOSE. It was originally the last `it()` inside
 * ResponsiveTable's describe block, where deleting or renaming that component's
 * tests would have silently removed the only repo-wide guard.
 *
 * It cannot tell a regex from a comment, and that is the right trade — it stays
 * dumb and therefore reliable. Describe the construct in prose rather than
 * quoting it.
 */

const LOOKBEHIND = /\(\?<[=!]/;
const SOURCE = /\.(ts|tsx|js|jsx)$/;

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return SOURCE.test(entry.name) ? [full] : [];
  });
}

describe("Safari compatibility", () => {
  it("has no regex lookbehind anywhere in src/", () => {
    const root = resolve(process.cwd(), "src");
    const files = filesUnder(root);
    const offenders = files
      .filter((f) => LOOKBEHIND.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(root.length + 1));

    // Non-vacuous: if this ever scans nothing, the walk broke, not the codebase.
    expect(files.length).toBeGreaterThan(100);
    expect(offenders).toEqual([]);
  });

  it("has no regex lookbehind in index.html's inline bootstrap", () => {
    // Not covered by the src/ walk, and it runs before any chunk loads — a
    // lookbehind here would break the page on Safari even harder.
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(LOOKBEHIND.test(html)).toBe(false);
  });
});
