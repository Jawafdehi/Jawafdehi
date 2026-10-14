import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker from '../../worker';

// Pre-rendering a route changes the URL its content lives at, and nothing in the
// build says so. #415 moved case pages to /case/<slug>/index.html, which made the
// edge 307 the slashless form — so all 463 sitemap entries and all 463
// rel=canonical values started pointing at a redirect, while every check stayed
// green. These tests pin the two halves that a crawler reads.

const INDEX_HTML =
  '<!doctype html><html><head><title>Jawafdehi</title>\n' +
  '<meta name="description" content="">\n' +
  '</head><body></body></html>';

function makeEnv(assets: Record<string, Response> = {}) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (assets[path]) return assets[path].clone();
        if (path === '/') {
          return new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response('not found', { status: 404 });
      },
    },
  };
}

function stubCaseApi(body: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })),
  );
}

beforeEach(() => {
  // `caches` is a Workers global with no Node equivalent. Always a miss, so each
  // test exercises the upstream path rather than inheriting a sibling's count.
  vi.stubGlobal('caches', {
    default: { match: async () => undefined, put: async () => undefined },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the case canonical names the URL the page is pre-rendered at', () => {
  it('ends in a slash, because /case/<slug> 307s to /case/<slug>/', async () => {
    stubCaseApi({ title: 'A case', slug: 'a-case', state: 'PUBLISHED', description: 'Body text.' });

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/case/a-case'),
      makeEnv() as never,
      {} as never,
    );
    const html = await res.text();

    expect(html).toContain('rel="canonical" href="https://jawafdehi.org/case/a-case/"');
    // The bug this replaces: naming the slashless URL, which is a redirect.
    expect(html).not.toContain('rel="canonical" href="https://jawafdehi.org/case/a-case"');
  });

  it('uses the API\'s canonical slug, not the requested one', async () => {
    // A renamed slug still has to canonicalise to the current URL, with the
    // slash applied after the rename rather than before it.
    stubCaseApi({ title: 'A case', slug: 'current-slug', state: 'PUBLISHED', description: 'Body.' });

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/case/old-slug'),
      makeEnv() as never,
      {} as never,
    );

    expect(await res.text()).toContain('rel="canonical" href="https://jawafdehi.org/case/current-slug/"');
  });
});

/** `/api/search/?type=case&page_size=1` answers with a count and nothing else. */
function stubCaseCount(count: number | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => (count === null
      ? new Response('upstream is down', { status: 503 })
      : new Response(JSON.stringify({ count }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))),
  );
}

describe('a case browse page past the end is a 404, not a soft 404', () => {
  it('404s a page past the end of the live archive', async () => {
    stubCaseCount(463); // 39 pages of 12

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/cases/page/40'),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('serves a page that is in range but not yet pre-rendered', async () => {
    // The case CodeRabbit raised on #416, and it is reachable: publishing cases
    // past a multiple of 12 adds a page immediately. /cases/page/39 hydrates
    // against the live count, sees 40 pages and renders a Next link to a page
    // the last build never wrote. "No file" must not mean "does not exist".
    stubCaseCount(470); // 40 pages — page 40 is real, just not built yet

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/cases/page/40'),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(200);
  });

  it('serves the page when the count is unavailable, rather than 404ing it', async () => {
    // Fails open on purpose. A 404 is what removes a URL from the index, so
    // deciding one on a backend blip is worse than the soft 404 being replaced
    // — the same call handleCaseMetaFallback makes.
    stubCaseCount(null);

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/cases/page/7'),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(200);
  });

  it.each(['abc', '0', '1', '-2', '2.5', '007'])(
    '404s /cases/page/%s without asking the API at all',
    async (raw) => {
      // `1` included deliberately: page one is /cases, so /cases/page/1 is a
      // second URL for the same listing. None of these need a count to rule
      // out, which keeps a flood of junk page numbers off the upstream.
      const upstream = vi.fn();
      vi.stubGlobal('fetch', upstream);

      const res = await worker.fetch(
        new Request(`https://jawafdehi.org/cases/page/${raw}`),
        makeEnv() as never,
        {} as never,
      );

      expect(res.status).toBe(404);
      expect(upstream).not.toHaveBeenCalled();
    },
  );

  it('still serves a page that WAS pre-rendered', async () => {
    const page2 = '<!doctype html><html><body>page 2 of the archive</body></html>';
    const env = makeEnv({
      '/cases/page/2': new Response(page2, { status: 200, headers: { 'content-type': 'text/html' } }),
    });

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/cases/page/2'),
      env as never,
      {} as never,
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('page 2 of the archive');
  });

  // The redirects into a case page have to land on the SAME form the canonical
  // names, or the 301 lands on a URL that immediately 307s. /case/212 cost two
  // hops that way, and URL Inspection reported the middle one as declaring a
  // redirecting URL as its canonical — "Duplicate, Google chose different
  // canonical than user" on 16 URLs in the 2026-10-07 sweep.
  it('sends a legacy numeric case URL straight to the slashed form, in one hop', async () => {
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/case/238'),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/case/case-081-cr-0060-681d9859/');
  });

  it('sends a court-ref case URL straight to the slashed form, in one hop', async () => {
    stubCaseApi({ slug: 'a-case' });

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/case/081-CR-0116'),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/case/a-case/');
  });

  it('leaves /cases itself alone', async () => {
    const env = makeEnv({
      '/cases': new Response('<!doctype html><html><body>page 1</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    });

    const res = await worker.fetch(new Request('https://jawafdehi.org/cases'), env as never, {} as never);
    expect(res.status).toBe(200);
  });
});
