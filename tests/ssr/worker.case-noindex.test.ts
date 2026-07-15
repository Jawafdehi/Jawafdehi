import { describe, it, expect, vi, afterEach } from 'vitest';

import worker from '../../worker';

// The Cloudflare worker injects share metadata for a case page when it isn't a
// pre-rendered asset (handleCaseMetaFallback). For an "unlisted" (non-PUBLISHED)
// case it must ALSO inject <meta name="robots" content="noindex"> so crawlers
// keep provisional, pre-publication records out of search — link-only, not
// indexed. PUBLISHED cases stay indexable.

const INDEX_HTML =
  '<!doctype html><html><head><title>Jawafdehi</title></head><body></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      // The case path is not a static asset (404 → fall through to the meta
      // fallback); the "/" index request returns the SPA shell.
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

function stubCaseApi(state: string) {
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
            state,
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('worker case-meta fallback: unlisted cases get noindex', () => {
  it('injects robots noindex for an IN_REVIEW (unlisted) case', async () => {
    stubCaseApi('IN_REVIEW');
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/case/some-case'),
      makeEnv(),
    );
    const html = await res.text();
    // Went through the meta fallback (share card present) ...
    expect(html).toContain('og:title');
    // ... and carries a noindex robots directive.
    expect(html).toMatch(/<meta[^>]*name="robots"[^>]*noindex/i);
  });

  it('does NOT inject robots noindex for a PUBLISHED case', async () => {
    stubCaseApi('PUBLISHED');
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/case/some-case'),
      makeEnv(),
    );
    const html = await res.text();
    expect(html).toContain('og:title');
    expect(html).not.toContain('noindex');
  });
});
