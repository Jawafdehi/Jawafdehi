// SPDX-License-Identifier: Hippocratic-3.0
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { crawlableListing } from '../../src/lib/crawlable-listing';

// /search/ is pre-rendered into dist/, and Cloudflare serves a path that
// matches an asset without running the Worker at all. The crawlable listings
// live in the Worker, so without `run_worker_first` they never ran in
// production — every unit test here called the Worker directly and passed.

const toml = readFileSync(join(__dirname, '../../wrangler.toml'), 'utf8');

function assetsSection(): string {
  const start = toml.indexOf('[assets]');
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = toml.slice(start + '[assets]'.length);
  const next = rest.search(/^\[/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function runWorkerFirst(): string[] {
  const line = assetsSection().match(/^run_worker_first\s*=\s*\[([^\]]*)\]/m);
  expect(line, 'wrangler.toml [assets] must set run_worker_first').not.toBeNull();
  return [...line![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function matches(pattern: string, path: string): boolean {
  const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
  return re.test(path);
}

describe('wrangler.toml routes /search through the Worker', () => {
  it.each(['/search', '/search/'])('runs the Worker first for %s', (path) => {
    expect(crawlableListing(path, '?type=case')).not.toBeNull();
    expect(runWorkerFirst().some((p) => matches(p, path))).toBe(true);
  });

  it('keeps every other asset off the Worker', () => {
    const patterns = runWorkerFirst();
    for (const path of ['/', '/about/', '/assets/app.js', '/search-index.json']) {
      expect(patterns.some((p) => matches(p, path)), path).toBe(false);
    }
  });
});
