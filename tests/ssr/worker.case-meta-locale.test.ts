import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// The head a social scraper gets for /case/* and /updates/* comes from the
// Worker, not from the app's <Seo>. Those two used to be written out separately,
// and drifted: the pages were corrected to declare this Nepali-first site as
// ne_NP while the Worker kept saying en_US, and the Worker's head-stripping
// removed the site-wide twitter:site without putting it back. Both now come from
// the shared tag list in src/utils/seo.

// The shell the worker fetches is the pre-rendered homepage: it already carries
// baked-in head tags (including the site-wide twitter:site) that the worker must
// strip and replace — except twitter:site, which it must keep.
const INDEX_HTML =
  '<!doctype html><html><head>' +
  '<title>Jawafdehi</title>' +
  '<meta name="description" content="Home page" />' +
  '<meta property="og:title" content="Home page" />' +
  '<meta property="og:locale" content="ne_NP" />' +
  '<meta name="twitter:site" content="@jawafdehi" />' +
  '<meta name="twitter:title" content="Home page" />' +
  '<link rel="canonical" href="https://jawafdehi.org/" />' +
  '</head><body></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
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

function stubCaseApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.includes('/cases/')) {
        return new Response(
          JSON.stringify({
            title: 'Some Case',
            slug: 'some-case',
            state: 'PUBLISHED',
            description: 'A description of the case.',
            key_allegations: ['An allegation'],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('', { status: 404 });
    }),
  );
}

async function caseHead(): Promise<string> {
  const res = await worker.fetch(
    new Request('https://jawafdehi.org/case/some-case'),
    makeEnv(),
  );
  return res.text();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker case-meta fallback: language and site handle', () => {
  it('declares the shared case page as Nepali-first', async () => {
    stubCaseApi();
    const html = await caseHead();

    expect(html).toContain('og:title');
    expect(html).toMatch(/<meta property="og:locale" content="ne_NP" \/>/);
    expect(html).toMatch(
      /<meta property="og:locale:alternate" content="en_US" \/>/,
    );
    expect(html).not.toContain('content="en_US" /><meta property="og:locale"');
  });

  it('emits exactly one og:locale and one canonical', async () => {
    stubCaseApi();
    const html = await caseHead();

    expect(html.match(/property="og:locale"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html.match(/<title>/g)).toHaveLength(1);
  });

  it('keeps the site-wide twitter:site while replacing the other twitter tags', async () => {
    stubCaseApi();
    const html = await caseHead();

    expect(html).toContain('<meta name="twitter:site" content="@jawafdehi" />');
    // The shell's own card copy is gone, replaced by the case's.
    expect(html).not.toContain('content="Home page"');
    expect(html).toContain('twitter:title');
  });
});
