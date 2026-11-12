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

describe('the retired browse URLs', () => {
  // /cases, /cases/page/:page and /courtcases folded into the typed /search.
  // The edge answers them with a 301 carrying the query string, so crawlers
  // see a move rather than a duplicate and a bookmarked filter still works —
  // and it does so without asking the API anything.
  it.each([
    ['/cases', '/search/?type=case'],
    ['/cases/', '/search/?type=case'],
    ['/cases/page/9999', '/search/?type=case'],
    ['/cases?search=dahal', '/search/?type=case&q=dahal'],
    ['/courtcases', '/search/?type=courtcase'],
    ['/courtcases/?q=%E0%A4%B8&court=supreme', '/search/?type=courtcase&q=%E0%A4%B8&court=supreme'],
  ])('301s %s to %s', async (path, location) => {
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);

    const res = await worker.fetch(
      new Request(`https://jawafdehi.org${path}`),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe(location);
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('redirects into a case page', () => {
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
});
