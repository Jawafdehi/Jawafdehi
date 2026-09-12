import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import { isKnownRoute, matchRoute } from '../../src/data/route-patterns';

// llms.txt promises things to machines, and the promises rot silently. Rename a
// route and the site keeps working, the build stays green, the sitemap updates
// itself — and llms.txt goes on advertising a URL that now 404s. The agent that
// follows it does not file a bug; it concludes the archive has no API and leaves.
//
// scripts/audit-llms-txt.mjs catches this by calling the live services, which is the
// only way to check an API endpoint. But it needs network, so it cannot gate a
// commit. This is the half that can: every jawafdehi.org path llms.txt mentions is
// checked against SITE_ROUTES using isKnownRoute — the SAME matcher the Worker uses
// to decide 200 vs 404 — so a renamed or deleted route fails here, offline, in the
// normal test run.
//
// It deliberately does NOT check api.jawafdehi.org: this repo does not define those
// routes, and asserting them from a hard-coded list would just be a second thing to
// keep in step. That is audit-llms-txt.mjs's job.

const LLMS_TXT = readFileSync(resolve(process.cwd(), 'public/llms.txt'), 'utf8');

const SITE_ORIGIN = 'https://jawafdehi.org';

// Placeholders llms.txt uses, with a value that exercises the same route.
const PLACEHOLDERS: Array<[RegExp, string]> = [
  [/\{prefix\}\/\{slug\}/g, 'someprefix/some-entity'],
  [/\{case_url\}/g, 'x'],
  [/\{slug\}/g, 'some-slug'],
  [/\{query\}/g, 'q'],
  [/\{name\}/g, 'n'],
];

/** Paths the Worker owns outright — real, but deliberately absent from SITE_ROUTES. */
const WORKER_OWNED = ['/oembed', '/robots.txt', '/sitemap.xml', '/llms.txt'];

function sitePathsIn(text: string): string[] {
  const urls = text.match(/https:\/\/jawafdehi\.org[^\s<>()[\]`,"|]*/g) ?? [];
  const paths = urls.map((url) => {
    let path = url.slice(SITE_ORIGIN.length).replace(/[.,]+$/, '');
    for (const [pattern, value] of PLACEHOLDERS) path = path.replace(pattern, value);
    // Drop the query string: routing is decided by the path.
    return path.split('?')[0] || '/';
  });
  return [...new Set(paths)];
}

describe('llms.txt only points at routes that exist', () => {
  it('finds site URLs to check, so this test cannot pass by finding nothing', () => {
    expect(sitePathsIn(LLMS_TXT).length).toBeGreaterThan(10);
  });

  it.each(sitePathsIn(LLMS_TXT))('%s is a real route', (path) => {
    if (WORKER_OWNED.includes(path.replace(/\/$/, '')) || WORKER_OWNED.includes(path)) return;

    expect(isKnownRoute(path), `llms.txt advertises ${path}, which SITE_ROUTES does not route`).toBe(
      true,
    );
  });

  it('would notice a route that no longer exists', () => {
    // The check has to be able to fail, or the assertions above are decoration.
    expect(isKnownRoute('/a-route-that-was-renamed-away')).toBe(false);
  });
});

describe('llms.txt still describes the surface it is supposed to', () => {
  // Not a spell-check: each of these is a claim an agent depends on, and each was
  // absent or wrong at some point during the review that produced this file.
  const REQUIRED = [
    // The working schema URL. It used to point at portal…/swagger/, which 301s to a
    // login page — the single worst defect in the original file.
    ['the machine-readable schema', 'api.jawafdehi.org/api/schema/'],
    // Identity, which is the whole basis for citing anything here.
    ['public_iri as the case identifier', 'public_iri'],
    ['@id as the entity identifier', '@id'],
    // Licence, stated rather than implied.
    ['the CC0 licence', 'creativecommons.org/publicdomain/zero/1.0/'],
    // The bilingual cross-type search, which is usually the right first call.
    ['the unified search endpoint', '/api/search/'],
    // Pagination: three endpoints, three different parameters, and `limit` is
    // silently ignored on two of them. An agent asking for one record was
    // downloading 4 MB.
    ['the pagination guidance', 'page_size'],
    // Court identifiers are opaque slugs; guessing "SC" 404s.
    ['a worked court-case example', 'okhaldhungadc'],
    // Credentialed endpoints, so "needs auth" is distinguishable from "absent".
    ['the credentialed-endpoint section', 'require credentials'],
    // How to contribute, which is the point of the write path.
    ['the contribution path', 'case-update-proposals'],
    // Entities are absent from the sitemap; without this an agent infers they have
    // no pages.
    ['how to enumerate entities', 'not the sitemap'],
    // Attribution. CC0 waives it, so it can only be asked for — and the ask is
    // worthless unless the file says exactly how to honour it.
    ['a how-to-cite section', 'How to cite'],
    ['the machine-readable credit field', 'creditText'],
    ['the requirement to include the canonical URL', 'include the canonical URL'],
    // The code is Hippocratic 3.0 and the data is not; conflating them is the
    // obvious mistake for a reuser to make.
    ['the code-vs-data licence split', 'Hippocratic License 3.0'],
  ];

  it.each(REQUIRED)('mentions %s', (_label, needle) => {
    expect(LLMS_TXT).toContain(needle);
  });

  it('never re-advertises the swagger URL that redirects to a login page', () => {
    // This is the specific regression to guard: it is the obvious-looking URL, and
    // it is the wrong one.
    expect(LLMS_TXT).not.toContain('portal.jawafdehi.org/api/swagger');
  });

  it('uses the canonical trailing-slash form for static pages', () => {
    // The site canonicalises a listing or static page WITH a trailing slash and a
    // record page WITHOUT one. Citing the other form means every link in llms.txt
    // redirects and none matches the canonical the page declares.
    for (const path of sitePathsIn(LLMS_TXT)) {
      const matched = matchRoute(path);
      if (!matched) continue;
      const isStaticListing = !matched.path.includes(':') && !matched.path.includes('*');
      if (isStaticListing && path !== '/') {
        expect(path.endsWith('/'), `${path} should be cited with a trailing slash`).toBe(true);
      }
    }
  });
});
