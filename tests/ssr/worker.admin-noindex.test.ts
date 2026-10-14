import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import worker from '../../worker';
import { SITE_ROUTES } from '../../src/data/site-routes';

// /admin was INDEXED: Search Console reported it "Submitted and indexed" with
// 125 impressions, and Googlebot spent ~70% of its crawl budget on it — 442 of
// 625 successful fetches in one week — while the case archive went uncrawled.
//
// It answered 200 with a 241 KB SPA shell carrying no <title>, no meta robots
// and no X-Robots-Tag. The zone-wide noindex header in the infra repo's
// response-headers.tf deliberately exempts the apex, so nothing covered it.
//
// 🚨 The page must KEEP answering 200. The fix is a header, not a robots.txt
// Disallow, and the two are mutually defeating: Disallow stops the fetch, so an
// already-indexed URL can never be re-read to learn it should drop. These tests
// pin both halves — the header is present AND the page still serves.

const INDEX_HTML =
  '<!doctype html><html><head><title>Jawafdehi</title></head><body></body></html>';

function makeEnv(assets: Record<string, Response> = {}) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (assets[path]) return assets[path].clone();
        if (path === '/') {
          return new Response(INDEX_HTML, {
            status: 200,
            headers: { 'content-type': 'text/html' },
          });
        }
        return new Response('not found', { status: 404 });
      },
    },
  };
}

const get = (path: string, env = makeEnv()) =>
  worker.fetch(new Request(`https://jawafdehi.org${path}`), env as never, {} as never);

beforeEach(() => {
  vi.stubGlobal('caches', {
    default: { match: async () => undefined, put: async () => undefined },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the admin panel is served but never indexed', () => {
  it.each([
    '/admin',
    '/admin/',
    '/admin/login',
    '/admin/moderation',
    '/admin/reviews/case/some-case',
    // The back-compat alias and the client-side redirect into the admin. The
    // latter matters because <Navigate> runs in the browser, so a crawler only
    // ever sees the 200 shell and never learns it points at the admin.
    '/moderation',
  ])('sends X-Robots-Tag: noindex on %s', async (path) => {
    const res = await get(path);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('keeps answering 200 so the noindex can actually be read', async () => {
    const res = await get('/admin');
    expect(res.status).toBe(200);
  });

  it('covers the non-public standalone routes too', async () => {
    for (const path of ['/document-viewer', '/embed/case/a-case']) {
      const res = await get(path);
      expect(res.headers.get('X-Robots-Tag'), path).toBe('noindex, nofollow');
    }
  });

  // The embed renders in an iframe, so its header set drops X-Frame-Options.
  // Adding noindex must not disturb that — otherwise the widget stops framing.
  it('does not break the embed route framing policy', async () => {
    const res = await get('/embed/case/a-case');
    expect(res.headers.get('X-Frame-Options')).toBeNull();
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('leaves public pages indexable', async () => {
    const env = makeEnv({
      '/about': new Response('<html><body>about</body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    });
    for (const path of ['/', '/about', '/cases']) {
      const res = await get(path, env);
      expect(res.headers.get('X-Robots-Tag'), path).toBeNull();
    }
  });

  // A prefix test on the URL would catch this; matching on the route pattern
  // does not. /administration is not a route at all, so it 404s — and a 404
  // carries noindex for its own unrelated reason, which is why this asserts the
  // status rather than the header.
  it('does not treat a lookalike path as the admin', async () => {
    const res = await get('/administration');
    expect(res.status).toBe(404);
  });

  // The flag is the single declaration of "not indexable"; worker.ts reads it
  // through isNoindexPath. If a route is marked and the Worker stops honouring
  // it, this catches the drift at the table rather than per-path above.
  it('honours every route SITE_ROUTES marks noindex', async () => {
    const marked = SITE_ROUTES.filter((r) => 'noindex' in r && r.noindex).map((r) => r.path);
    expect(marked).toContain('/admin/*');
    const sample: Record<string, string> = {
      '/admin/*': '/admin/login',
      '/portal/*': '/portal/cases',
      '/embed/case/:id': '/embed/case/a-case',
      '/document-viewer': '/document-viewer',
      '/updates/preview': '/updates/preview',
      '/moderation': '/moderation',
    };
    for (const pattern of marked) {
      const path = sample[pattern];
      expect(path, `add a sample path for ${pattern}`).toBeDefined();
      const res = await get(path);
      expect(res.headers.get('X-Robots-Tag'), pattern).toBe('noindex, nofollow');
    }
  });
});
