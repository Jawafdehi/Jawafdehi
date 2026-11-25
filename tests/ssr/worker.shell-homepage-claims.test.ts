// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect } from 'vitest';

import worker, { stripHomepageUrlClaims } from '../../worker';

// The SPA shell is the PRE-RENDERED HOMEPAGE. Served under another path (a
// routed page that is not pre-rendered, like /data-quality), its
// canonical=/ told crawlers that page was a copy of the home page.

const HOME_HTML =
  '<!doctype html><html><head><title>Jawafdehi</title>' +
  '<link data-rh="true" rel="canonical" href="https://jawafdehi.org/"/>' +
  '<meta data-rh="true" property="og:url" content="https://jawafdehi.org/"/>' +
  '<meta data-rh="true" property="og:title" content="Jawafdehi"/>' +
  '</head><body><a rel="canonical" href="/x">body link kept</a></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response(HOME_HTML, {
              status: 200,
              headers: { 'content-type': 'text/html', 'content-length': String(HOME_HTML.length), etag: '"home"' },
            })
          : new Response('not found', { status: 404 }),
    },
    EDGE_SSR: 'off',
  };
}

describe('the SPA shell under a path other than /', () => {
  it('drops the homepage canonical, og:url and social title, and keeps the body', async () => {
    const res = await worker.fetch(new Request('https://jawafdehi.org/data-quality'), makeEnv());
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).not.toContain('href="https://jawafdehi.org/"');
    expect(html).not.toContain('property="og:url"');
    expect(html).not.toContain('property="og:title"');
    expect(html).toContain('<a rel="canonical" href="/x">body link kept</a>');
    expect(res.headers.get('Content-Length')).toBeNull();
    expect(res.headers.get('ETag')).toBeNull();
  });

  it('leaves the homepage itself alone', async () => {
    const res = await worker.fetch(new Request('https://jawafdehi.org/'), makeEnv());
    expect(await res.text()).toBe(HOME_HTML);
  });
});

describe('stripHomepageUrlClaims', () => {
  it("drops what the homepage SAYS it is, not just its URL", () => {
    // Under /data-quality the homepage's title and description read as a second
    // homepage to any crawler that does not run the SPA.
    const html =
      '<html><head><title data-rh="true">Jawafdehi Initiative — Nepal&#x27;s Digital Archive</title>' +
      '<meta data-rh="true" name="description" content="Nepal\'s open archive of public accountability."/>' +
      '<meta data-rh="true" name="twitter:title" content="Jawafdehi Initiative"/>' +
      '<meta data-rh="true" name="twitter:description" content="Open archive."/>' +
      '<meta data-rh="true" property="og:description" content="Open archive."/>' +
      '<meta name="viewport" content="width=device-width"/>' +
      '</head><body><p>Nepal\'s open archive</p></body></html>';
    const out = stripHomepageUrlClaims(html);
    expect(out).toContain('<title data-rh="true">Jawafdehi</title>');
    expect(out).not.toMatch(/name="description"|twitter:title|twitter:description|og:description/);
    // Unrelated head tags and the body are untouched.
    expect(out).toContain('name="viewport"');
    expect(out).toContain("<p>Nepal's open archive</p>");
  });


  it('returns HTML without a head unchanged', () => {
    expect(stripHomepageUrlClaims('<p rel="canonical">x</p>')).toBe('<p rel="canonical">x</p>');
  });
});
