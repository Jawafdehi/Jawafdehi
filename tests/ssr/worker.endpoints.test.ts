import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';
import { WORKER_OWNED_PATHS, isKnownRoute } from '../../src/data/route-patterns';

// The Worker answers a handful of paths itself, before the SPA fallback. None
// of them is an App.tsx route, so if a dispatch stops matching there is nothing
// to render — the request falls through to the shell. Once the shell answered
// 200 for any known route, a missed dispatch became invisible: /api/latest-videos/
// returned the site's HTML at 200 where the caller expected JSON. These pin the
// trailing-slash form of every worker-owned path so that cannot come back.

const INDEX_HTML =
  '<!doctype html><html><head><title>Jawafdehi</title></head><body></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        if (new URL(req.url).pathname === '/') {
          return new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response('not found', { status: 404 });
      },
    },
  };
}

// handleLatestVideos reaches for the Workers runtime cache, which vitest's
// environment does not provide. Always-miss, discard-on-put.
function stubRuntime() {
  vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('<feed/>', { status: 200, headers: { 'content-type': 'application/xml' } })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker-owned endpoints', () => {
  it.each(WORKER_OWNED_PATHS.flatMap((path) => [path, `${path}/`]))(
    'answers %s itself instead of falling through to the SPA shell',
    async (path) => {
      stubRuntime();

      const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), makeEnv());

      expect(await res.text()).not.toContain('<!doctype html>');
    },
  );

  it('serves the YouTube feed for the trailing-slash form', async () => {
    stubRuntime();

    const res = await worker.fetch(new Request('https://jawafdehi.org/api/latest-videos/'), makeEnv());

    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('301s the trailing-slash /weekly alias', async () => {
    const res = await worker.fetch(new Request('https://jawafdehi.org/weekly/'), makeEnv());

    expect({ status: res.status, location: res.headers.get('Location') }).toEqual({
      status: 301,
      location: '/saptahik',
    });
  });

  // Both forms have to land on the page in one hop: the trailing slash is the
  // form the page is pre-rendered at, so a 302 to the slashless URL would bounce
  // through the assets binding's own 307. The 302 is deliberate — the redirect
  // retires when /research becomes a dashboard over several publications.
  it.each(['/research', '/research/'])('302s %s to the research page', async (path) => {
    const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), makeEnv());

    expect({ status: res.status, location: res.headers.get('Location') }).toEqual({
      status: 302,
      location: '/research/corruption-accountability/',
    });
  });

  it('carries the query string through the /research redirect', async () => {
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/research?utm_source=reel'),
      makeEnv(),
    );

    expect(res.headers.get('Location')).toBe(
      '/research/corruption-accountability/?utm_source=reel',
    );
  });

  // Listing them as SPA routes is what hid the bug: the shell answered 200, so
  // a path the Worker never actually handled looked healthy.
  it.each(WORKER_OWNED_PATHS)('does not classify %s as an SPA route', (path) => {
    expect(isKnownRoute(path)).toBe(false);
  });
});
