// SPDX-License-Identifier: Hippocratic-3.0
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nothing the Worker imports may use vite's `@/` alias.
 *
 * worker.ts is bundled by wrangler, not vite, and wrangler does not know the
 * alias. CI never bundles the Worker — so an aliased import anywhere in its
 * graph passes every test here and fails at DEPLOY, with production frozen on
 * the previous bundle. Until now this was a comment in material-meta.ts; this
 * makes it a check. Type-only imports are erased before bundling and are fine.
 */

const ROOT = resolve(__dirname, "../..");
const SPECIFIER = /^\s*(import|export)\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm;

function resolveRelative(fromFile: string, spec: string): string | null {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(candidate) && !candidate.endsWith("/")) {
      try {
        readFileSync(candidate);
        return candidate;
      } catch {
        // a directory: try the next form
      }
    }
  }
  return null;
}

function aliasedImports(entry: string): string[] {
  const seen = new Set<string>();
  const problems: string[] = [];
  const queue = [resolve(ROOT, entry)];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf-8");
    for (const m of source.matchAll(SPECIFIER)) {
      const typeOnly = Boolean(m[2]);
      const spec = m[3] ?? m[4];
      if (spec.startsWith("@/")) {
        if (!typeOnly) problems.push(`${relative(ROOT, file)} → ${spec}`);
      } else if (spec.startsWith(".")) {
        const next = resolveRelative(file, spec);
        if (next && /\.(ts|tsx)$/.test(next)) queue.push(next);
      }
    }
  }
  return problems;
}

describe("the Worker's import graph", () => {
  it("never reaches vite's @/ alias", () => {
    expect(aliasedImports("worker.ts")).toEqual([]);
  });

  it("would catch one if it did", () => {
    // archive-search-params.ts imports through @/; the Worker reads the search
    // constants from archive-search-window.ts precisely to avoid pulling it in.
    expect(aliasedImports("src/utils/archive-search-params.ts").length).toBeGreaterThan(0);
  });
});
