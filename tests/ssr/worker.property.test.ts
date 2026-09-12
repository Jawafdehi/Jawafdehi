import { describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import worker from '../../worker';
import { isKnownRoute, isWorkerOwnedPath } from '../../src/data/route-patterns';

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
          // about the unrouted case. Worker-owned endpoints answer before the
          // SPA fallback, so they are not unrouted either.
          const pathname = new URL(url).pathname;
          fc.pre(!isKnownRoute(pathname) && !isWorkerOwnedPath(pathname));

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

  // These paths reach the SPA shell rather than a pre-rendered file. Two of them
  // never touch the API; the /entity/* one does, so its fetch is stubbed.
  //
  // It has to be. Left unstubbed this test made a live call to
  // api.jawafdehi.org and then disagreed with itself by environment:
  //
  //   - under jsdom (how this suite runs), `new AbortController().signal` is a
  //     jsdom-realm object and Node's fetch rejects it with a TypeError, so
  //     fetchWithTimeout threw, returned null, and the worker fell through to
  //     the shell at 200 — the assertion passed for the wrong reason;
  //   - on a CI runner the same call succeeded, got the API's real 404 for a
  //     entity that does not exist, and the worker correctly answered 404.
  //
  // Since entity pages started answering a real 404 for a record the API denies,
  // that difference is a status difference, so the test failed on CI and passed
  // locally. Stubbing the lookup is what makes the assertion mean something.
  it('still returns 200 for a routed path that is not pre-rendered', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ nes_id: 'organization/np/tu', name: 'Tribhuvan University' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    try {
      for (const path of ['/donate/success', '/entity/organization/np/tu', '/newsletter/unsubscribe/tok3n']) {
        const result = await worker.fetch(
          new Request(`https://jawafdehi.org${path}`),
          shellOnlyEnv('<html>shell</html>'),
        );
        expect({ path, status: result.status }).toEqual({ path, status: 200 });
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  // The other half of the same contract, pinned here so nobody "fixes" the test
  // above by loosening the entity route back into a soft 404.
  it('returns a real 404 for a routed entity path the API denies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"detail":"Not found."}', { status: 404 })),
    );

    try {
      const result = await worker.fetch(
        new Request('https://jawafdehi.org/entity/organization/np/tu'),
        shellOnlyEnv('<html>shell</html>'),
      );

      expect(result.status).toBe(404);
      expect(result.headers.get('X-Robots-Tag')).toBe('noindex');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
