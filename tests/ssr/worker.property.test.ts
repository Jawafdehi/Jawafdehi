import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import worker from '../../worker';
import { isKnownRoute } from '../../src/data/route-patterns';

describe('Property 13: Worker returns correct pre-rendered HTML for known routes', () => {
  it('returns the asset response as-is when ASSETS.fetch returns non-404', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        fc.constantFrom(200, 201, 202, 206, 301, 302, 307, 308, 400, 401, 403),
        fc.string(),
        async (url, status, body) => {
          const request = new Request(url);
          const assetResponse = new Response(body, { status });
          const env = {
            ASSETS: {
              fetch: async (_req: Request) => assetResponse,
            },
          };

          const result = await worker.fetch(request, env);
          expect(result.status).toBe(status);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Serves the SPA shell for any path ASSETS misses. Only paths the SPA actually
// routes get a 200; the rest are real 404s carrying the same body, so React
// Router still renders the styled NotFound page.
function shellOnlyEnv(indexBody: string) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const reqUrl = new URL(req.url);
        if (reqUrl.pathname === '/') {
          return new Response(indexBody, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response('Not Found', { status: 404 });
      },
    },
  };
}

describe('Property 14: Worker returns a real 404 for unrouted paths', () => {
  it('returns 404 with the index.html body for paths the SPA does not route', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        fc.string(),
        async (url, indexBody) => {
          // fc.webUrl() overwhelmingly yields paths with no SPA route; skip the
          // rare generated path that happens to be real so the property stays
          // about the unrouted case.
          fc.pre(!isKnownRoute(new URL(url).pathname));

          const result = await worker.fetch(new Request(url), shellOnlyEnv(indexBody));

          expect(result.status).toBe(404);
          expect(result.headers.get('X-Robots-Tag')).toBe('noindex');
          expect(result.headers.get('Cache-Control')).toBe('no-store');
          expect(await result.text()).toBe(indexBody);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('still returns 200 for a routed path that is not pre-rendered', async () => {
    for (const path of ['/donate/success', '/entity/organization/np/tu', '/newsletter/unsubscribe/tok3n']) {
      const result = await worker.fetch(
        new Request(`https://jawafdehi.org${path}`),
        shellOnlyEnv('<html>shell</html>'),
      );
      expect({ path, status: result.status }).toEqual({ path, status: 200 });
    }
  });
});
