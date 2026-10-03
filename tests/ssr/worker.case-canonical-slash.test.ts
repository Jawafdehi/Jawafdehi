import { describe, it, expect, vi, afterEach } from 'vitest';

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

describe('a case browse page past the end is a 404, not a soft 404', () => {
  it('404s /cases/page/40 when no file was pre-rendered for it', async () => {
    // Every page that exists is pre-rendered to a file, so reaching the SPA
    // fallback on this route means the number is past the end of the archive.
    // The route matches, which used to be enough to call it a 200 — and the SPA
    // then rendered NotFound into that 200.
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/cases/page/40'),
      makeEnv() as never,
      {} as never,
    );

    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

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
