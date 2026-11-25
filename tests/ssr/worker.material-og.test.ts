import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker from '../../worker';

// Every material page used to unfurl as the site-wide banner: 346k documents,
// one picture, and the document itself nowhere in it. The API now composes a
// card per document (materials/og_card.py); this Worker points the page's
// og:image at it and proxies it under jawafdehi.org. A crawler never runs the
// React app, so the head injected here and the card route are all it sees.

const INDEX_HTML =
  '<!doctype html><html><head>' +
  '<title>Jawafdehi</title>' +
  '<meta property="og:url" content="https://jawafdehi.org/" />' +
  '<meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />' +
  '</head><body></body></html>';

const TAIL = 'official_report/oag-13489';
const MATERIAL = {
  '@id': `https://jawafdehi.org/material/${TAIL}`,
  '@type': 'DigitalDocument',
  name: { ne: 'महालेखापरीक्षकको वार्षिक प्रतिवेदन' },
};

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } })
          : new Response('not found', { status: 404 }),
    },
  };
}

function urlOf(input: string | URL | Request): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
}

let calls: string[] = [];

function stubApi(options: { cardStatus?: number; cardThrows?: boolean } = {}) {
  const { cardStatus = 200, cardThrows = false } = options;
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = urlOf(input);
      calls.push(url);
      if (url.includes('/og-card.jpg')) {
        if (cardThrows) throw new Error('upstream unreachable');
        return new Response(cardStatus === 200 ? new Uint8Array([0xff, 0xd8, 0xff]) : null, {
          status: cardStatus,
          headers: cardStatus === 200 ? { 'Content-Type': 'image/jpeg' } : {},
        });
      }
      if (url.includes('/api/materials/')) {
        return new Response(JSON.stringify(MATERIAL), {
          status: 200,
          headers: { 'Content-Type': 'application/ld+json' },
        });
      }
      return new Response('not found', { status: 404 });
    }),
  );
}

beforeEach(() => {
  vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const get = (path: string) =>
  worker.fetch(new Request(`https://jawafdehi.org${path}`), makeEnv() as never);

describe('the material page head', () => {
  it("points og:image at the document's own card, not the site banner", async () => {
    stubApi();
    const html = await (await get(`/material/${TAIL}`)).text();

    expect(html).toContain(
      `<meta property="og:image" content="https://jawafdehi.org/assets/og/material/${TAIL}.jpg" />`,
    );
    expect(html).not.toContain('social-preview.png');
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
  });
});

describe('the material card route', () => {
  it('proxies the composed card from the API', async () => {
    stubApi();
    const response = await get(`/assets/og/material/${TAIL}.jpg`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('Cache-Control')).toContain('max-age=86400');
    expect(calls).toContain(`https://api.jawafdehi.org/api/materials/${TAIL}/og-card.jpg`);
  });

  it('passes a Devanagari ident through as itself, encoded once', async () => {
    stubApi();
    const ident = encodeURIComponent('प्रतिवेदन');
    await get(`/assets/og/material/official_report/${ident}.jpg`);

    expect(calls).toContain(
      `https://api.jawafdehi.org/api/materials/official_report/${ident}/og-card.jpg`,
    );
  });

  it.each([
    ['the API answers 404', { cardStatus: 404 }],
    ['the API answers 503 (no text shaping)', { cardStatus: 503 }],
    ['the API is unreachable', { cardThrows: true }],
  ])('falls back to the site banner when %s', async (_why, options) => {
    stubApi(options);
    const response = await get(`/assets/og/material/${TAIL}.jpg`);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://jawafdehi.org/assets/social-preview.png');
  });

  it('refuses a traversal tail without calling the API', async () => {
    // `..` would otherwise normalise into a different API endpoint.
    stubApi();
    const response = await get('/assets/og/material/official_report/..%2F..%2Fcases%2Fx.jpg');

    expect(response.status).toBe(302);
    expect(calls.filter((url) => url.includes('og-card'))).toEqual([]);
  });

  it('refuses a single-segment tail', async () => {
    stubApi();
    const response = await get('/assets/og/material/oag-13489.jpg');

    expect(response.status).toBe(302);
    expect(calls).toEqual([]);
  });

  it('answers a HEAD request without trying to cache it', async () => {
    // Cloudflare's cache.put throws on any method but GET; caching a HEAD used
    // to turn an uncached card into a 500.
    stubApi();
    vi.stubGlobal('caches', {
      default: {
        match: async () => undefined,
        put: async (req: Request) => {
          if (req.method !== 'GET') throw new TypeError('Cannot cache a non-GET request');
        },
      },
    });
    const response = await worker.fetch(
      new Request(`https://jawafdehi.org/assets/og/material/${TAIL}.jpg`, { method: 'HEAD' }),
      makeEnv() as never,
    );
    expect(response.status).toBe(200);
  });

  it('answers 405 to anything but GET and HEAD', async () => {
    stubApi();
    const response = await worker.fetch(
      new Request(`https://jawafdehi.org/assets/og/material/${TAIL}.jpg`, { method: 'POST' }),
      makeEnv() as never,
    );
    expect(response.status).toBe(405);
  });
});
