// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';
import { sitemapUpstreamPath, withCanonicalSlashes, withSiteSitemap } from '../../worker/sitemap';

// jawafdehi.org/sitemap*.xml is the API's sitemap, proxied and cached, plus the
// site's own /sitemap-site.xml (a static asset) added to the index.

const API_INDEX =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  '<sitemap><loc>https://jawafdehi.org/sitemap-case.xml</loc></sitemap>' +
  '<sitemap><loc>https://jawafdehi.org/sitemap-material.xml?p=2</loc></sitemap>' +
  '</sitemapindex>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response('<!doctype html><html><head></head><body></body></html>', { status: 200 })
          : new Response('not found', { status: 404 }),
    },
  };
}

function stubApi(handler: (url: string) => Response) {
  const fetch = vi.fn(async (input: string | URL | Request) =>
    handler(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('sitemapUpstreamPath', () => {
  it('maps the index and API children, keeping only ?p', () => {
    expect(sitemapUpstreamPath('/sitemap.xml', '')).toBe('/sitemap.xml');
    expect(sitemapUpstreamPath('/sitemap-material.xml', '?p=3&utm_source=x')).toBe('/sitemap-material.xml?p=3');
    expect(sitemapUpstreamPath('/sitemap-case.xml', '')).toBe('/sitemap-case.xml');
  });

  it('leaves the static site sitemap and anything else alone', () => {
    expect(sitemapUpstreamPath('/sitemap-site.xml', '')).toBeNull();
    expect(sitemapUpstreamPath('/sitemap-../x.xml', '')).toBeNull();
    expect(sitemapUpstreamPath('/sitemap.xml.gz', '')).toBeNull();
    expect(sitemapUpstreamPath('/sitemap-case.xml', '?p=0')).toBeNull();
    expect(sitemapUpstreamPath('/sitemap-case.xml', '?p=abc')).toBeNull();
  });
});

describe('withSiteSitemap', () => {
  it('adds the site child once, inside the index', () => {
    const out = withSiteSitemap(API_INDEX);
    expect(out).toContain('<sitemap><loc>https://jawafdehi.org/sitemap-site.xml</loc></sitemap></sitemapindex>');
    expect(withSiteSitemap(out)).toBe(out);
  });
});

describe('withCanonicalSlashes', () => {
  it('slashes case and entity locs, the canonical form of those pages', () => {
    const xml =
      '<url><loc>https://jawafdehi.org/case/some-slug</loc></url>' +
      '<url><loc>https://jawafdehi.org/entity/person/ram</loc></url>' +
      '<url><loc>https://jawafdehi.org/case/already/</loc></url>' +
      '<url><loc>https://jawafdehi.org/material/ag/10</loc></url>' +
      '<url><loc>https://jawafdehi.org/courtcase/special/081-cr-0154</loc></url>';
    expect(withCanonicalSlashes(xml)).toBe(
      '<url><loc>https://jawafdehi.org/case/some-slug/</loc></url>' +
        '<url><loc>https://jawafdehi.org/entity/person/ram/</loc></url>' +
        '<url><loc>https://jawafdehi.org/case/already/</loc></url>' +
        '<url><loc>https://jawafdehi.org/material/ag/10</loc></url>' +
        '<url><loc>https://jawafdehi.org/courtcase/special/081-cr-0154</loc></url>',
    );
  });

  it('slashes series locs, which the API lists from its series section', () => {
    expect(
      withCanonicalSlashes('<url><loc>https://jawafdehi.org/series/deepak-bhatta-affair</loc></url>'),
    ).toBe('<url><loc>https://jawafdehi.org/series/deepak-bhatta-affair/</loc></url>');
  });

  it('leaves sitemap index children alone', () => {
    expect(withCanonicalSlashes(API_INDEX)).toBe(API_INDEX);
  });
});

describe('the proxied sitemap', () => {
  it('serves the API index with the site child added, as XML', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = stubApi(() => new Response(API_INDEX, { status: 200, headers: { 'Content-Type': 'application/xml' } }));

    const res = await worker.fetch(new Request('https://jawafdehi.org/sitemap.xml'), makeEnv());

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(res.headers.get('Cache-Tag')).toBeNull();
    const body = await res.text();
    expect(body).toContain('sitemap-case.xml');
    expect(body).toContain('https://jawafdehi.org/sitemap-site.xml');
    expect(fetch.mock.calls[0][0]).toBe('https://api.jawafdehi.org/sitemap.xml');
  });

  it('proxies a child page', async () => {
    const fetch = stubApi(() => new Response('<urlset/>', { status: 200, headers: { 'Content-Type': 'application/xml' } }));
    const res = await worker.fetch(new Request('https://jawafdehi.org/sitemap-material.xml?p=2'), makeEnv());
    expect(res.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe('https://api.jawafdehi.org/sitemap-material.xml?p=2');
  });

  it('answers 503 with Retry-After when the API fails and nothing is cached', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubApi(() => new Response('upstream down', { status: 502, headers: { 'Content-Type': 'text/html' } }));
    const res = await worker.fetch(new Request('https://jawafdehi.org/sitemap.xml'), makeEnv());
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('300');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('passes a 404 through for an unknown section', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubApi(() => new Response('nope', { status: 404, headers: { 'Content-Type': 'text/html' } }));
    const res = await worker.fetch(new Request('https://jawafdehi.org/sitemap-nothing.xml'), makeEnv());
    expect(res.status).toBe(404);
  });
});
