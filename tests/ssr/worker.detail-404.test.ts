import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// A detail path (/case/<slug>, /updates/<slug>) is a real SPA route, so the
// route table alone cannot tell a live record from a renamed slug. The worker
// asks the API. A positive "does not exist" becomes a 404; a backend that does
// not answer must NOT — deindexing a live case over a slow API would be worse
// than the soft 404 this replaces.

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

function stubApi(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      return handler(url);
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('detail routes that the API says do not exist', () => {
  it('404s a case slug the API reports as missing', async () => {
    stubApi(() => new Response(JSON.stringify({ detail: 'Not found.' }), { status: 404 }));

    const res = await worker.fetch(new Request('https://jawafdehi.org/case/renamed-away'), makeEnv());

    expect(res.status).toBe(404);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    // Still the SPA shell, so React Router renders the styled NotFound page.
    expect(await res.text()).toContain('<!doctype html>');
  });

  it('404s an article slug the CMS answers with an empty list', async () => {
    stubApi(() => new Response(JSON.stringify({ items: [] }), { status: 200 }));

    const res = await worker.fetch(new Request('https://jawafdehi.org/updates/no-such-post'), makeEnv());

    expect(res.status).toBe(404);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('keeps 200 when the API does not answer at all', async () => {
    stubApi(() => {
      throw new Error('connection reset');
    });

    const res = await worker.fetch(new Request('https://jawafdehi.org/case/some-live-case'), makeEnv());

    expect(res.status).toBe(200);
  });

  it('keeps 200 when the API errors with a 500', async () => {
    stubApi(() => new Response('upstream exploded', { status: 500 }));

    const res = await worker.fetch(new Request('https://jawafdehi.org/case/some-live-case'), makeEnv());

    expect(res.status).toBe(200);
  });
});
