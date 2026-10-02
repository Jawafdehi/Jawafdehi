import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// What status an entity URL answers is not cosmetic. A URL that cannot resolve but
// answers 200 is a soft 404, and this site already decided against those: the
// Worker returns a real 404 for anything the SPA does not route, because serving
// the shell at 200 "made every typo and every dead link indexable, and told link
// checkers the site had no broken links at all".
//
// Entity URLs were leaking the same problem through a side door. /entity/2104 and
// /entity/deptofsurvey answered HTTP 200 carrying the HOMEPAGE's title,
// description and canonical — so a crawler saw a duplicate of the front page at an
// /entity/ URL. Verified against the live API: the record endpoint answers 404 for
// EVERY single-segment ref, numeric ids and bare prefixes alike, so those URLs
// could never have resolved.
//
// The rule this locks in: a positive "no such entity" from the API, or a tail that
// cannot be an IRI tail, is a 404 with noindex and no-store. A timeout is NOT — it
// falls through to the shell, because 404-ing a page that exists over a slow
// backend would deindex real content.

const SHELL =
  '<!doctype html><html><head><title>Jawafdehi</title>' +
  '<meta name="description" content="Home page" />' +
  '<link rel="canonical" href="https://jawafdehi.org/" />' +
  '</head><body></body></html>';

const env = {
  ASSETS: {
    fetch: async (req: Request) =>
      new URL(req.url).pathname === '/'
        ? new Response(SHELL, { status: 200, headers: { 'content-type': 'text/html' } })
        : new Response('not found', { status: 404 }),
  },
};

const REAL_TAIL = 'deptofsurvey/department-of-survey';
const RECORD = {
  '@id': `https://jawafdehi.org/entity/${REAL_TAIL}`,
  '@type': 'AdministrativeArea',
  name: { en: 'Department of Survey, Damak' },
};

const fetched: string[] = [];

/** Mirrors the live API: only the real two-segment tail resolves. */
function stubLikeProduction() {
  fetched.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      fetched.push(url);
      return new RegExp(`/entities/${REAL_TAIL}/?$`).test(url)
        ? new Response(JSON.stringify(RECORD), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        : new Response(JSON.stringify({ error: 'not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' },
          });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function get(path: string) {
  const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), env);
  return { res, html: await res.text() };
}

describe('an entity URL that resolves', () => {
  it('answers 200 with the record’s own head', async () => {
    stubLikeProduction();
    const { res, html } = await get(`/entity/${REAL_TAIL}`);

    expect(res.status).toBe(200);
    expect(html).toContain('Department of Survey, Damak | Jawafdehi Entity Registry');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(res.headers.get('X-Robots-Tag')).toBeNull();
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  it('canonicalises away a trailing slash rather than splitting the page in two', async () => {
    stubLikeProduction();
    const withSlash = await get(`/entity/${REAL_TAIL}/`);
    const without = await get(`/entity/${REAL_TAIL}`);

    // The API serves both forms, so without this both would be indexable copies.
    const canonical = `<link rel="canonical" href="https://jawafdehi.org/entity/${REAL_TAIL}" />`;
    expect(withSlash.html).toContain(canonical);
    expect(without.html).toContain(canonical);
    expect(withSlash.res.status).toBe(200);
  });
});

describe('an entity URL that cannot resolve answers a real 404', () => {
  const deadEnds: Array<[string, string]> = [
    ['an unknown slug under a real prefix', `/entity/deptofsurvey/nope-not-real`],
    ['a bare prefix with no slug', '/entity/deptofsurvey'],
    // Verified live: /api/entities/1, /42, /2104 and /5000 all 404. The case
    // serializer stopped returning numeric entity ids, so nothing links here.
    ['a numeric id', '/entity/2104'],
    ['a low numeric id', '/entity/1'],
    // The API is case-sensitive on the tail.
    ['the wrong case', '/entity/DeptOfSurvey/Department-Of-Survey'],
    ['an empty segment', '/entity/a//b'],
    ['no tail at all', '/entity/'],
  ];

  it.each(deadEnds)('404s %s', async (_label, path) => {
    stubLikeProduction();
    const { res } = await get(path);

    expect(res.status).toBe(404);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
    // A 404 must not sit in a cache: the same path can become real when an entity
    // is published.
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('serves the shell body at 404 so React renders the styled not-found page', async () => {
    stubLikeProduction();
    const { res, html } = await get('/entity/2104');

    // Deliberate, and the same contract the Worker already uses for an unrouted
    // path: the BODY stays the shell so React Router renders NotFound, and only
    // the status line changes — "which is the part crawlers read". The head is the
    // shell's, which is fine precisely because 404 + noindex is authoritative and a
    // scraper never treats a 404 as content.
    expect(res.status).toBe(404);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(html).toContain('<title>Jawafdehi</title>');
  });

  it('rejects a malformed tail without calling the API at all', async () => {
    stubLikeProduction();
    await get('/entity/a//b');

    expect(fetched).toEqual([]);
  });
});

describe('a slow or broken backend does not deindex a real entity', () => {
  it('falls through to the shell when the upstream fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('timeout');
      }),
    );
    const { res, html } = await get(`/entity/${REAL_TAIL}`);

    // 200, not 404: the API did not say the entity is missing, it said nothing.
    expect(res.status).toBe(200);
    expect(html).toContain('<title>Jawafdehi</title>');
  });

  it('falls through to the shell on a 500 rather than claiming the entity is gone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"detail":"boom"}', {
            status: 500,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    const { res } = await get(`/entity/${REAL_TAIL}`);

    expect(res.status).toBe(200);
  });
});

describe('the case route follows the same rule', () => {
  function stubCase() {
    fetched.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        fetched.push(url);
        return /\/cases\/real-case\//.test(url)
          ? new Response(JSON.stringify({ title: 'Real', slug: 'real-case', state: 'PUBLISHED' }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            })
          : new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
      }),
    );
  }

  it('200s a real case and 404s a missing one', async () => {
    stubCase();
    expect((await get('/case/real-case')).res.status).toBe(200);

    stubCase();
    const missing = await get('/case/nope-not-real');
    expect(missing.res.status).toBe(404);
    expect(missing.res.headers.get('X-Robots-Tag')).toBe('noindex');
  });
});
