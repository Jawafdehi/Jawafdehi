// SPDX-License-Identifier: Hippocratic-3.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import worker, { EdgePages } from '../../worker';
// The module instance worker.ts imports as './worker/edge-bundle' (aliased in
// vitest.config.ts), so spying on it drives the Worker's renders.
import { bundle } from '../support/edge-bundle-stub';

// Crawlable search listings through the Worker: which /search URLs reach the
// edge renderer, what URL they are rendered and cached under, and that anything
// else — or a listing that fails — still gets the pre-rendered /search page,
// exactly as every /search URL did before.

const PRERENDERED_SEARCH = '<!doctype html><html><head><title>अभिलेख खोज</title></head><body>static</body></html>';

function makeEnv(extra: Record<string, string> = {}) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (path === '/search/' || path === '/search' || path === '/') {
          return new Response(PRERENDERED_SEARCH, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response('not found', { status: 404 });
      },
    },
    ...extra,
  };
}

function makeCtx(env: ReturnType<typeof makeEnv>) {
  const inner = { cache: { purge: vi.fn() } };
  const edgePages = new (EdgePages as unknown as new (ctx: unknown, env: unknown) => EdgePages)(inner, env);
  const fetch = vi.fn((request: Request) => edgePages.fetch(request));
  return { ctx: { exports: { EdgePages: { fetch } } }, fetch };
}

function listingRender(html = '<main><a href="/case/namuna-cooperative-fraud/">Namuna</a></main>') {
  return {
    html,
    helmetContext: { helmet: { title: { toString: () => '<title>मुद्दाहरू | Jawafdehi Initiative</title>' } } },
    dehydratedState: { queries: [] },
    prefetch: { fulfilled: [['archive-search', {}]], failed: [] },
  };
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('crawlable search listings at the edge', () => {
  it('renders an unfiltered listing, under its one normalised URL', async () => {
    const render = vi.spyOn(bundle, 'render').mockResolvedValue(listingRender() as never);
    const env = makeEnv();
    const { ctx, fetch } = makeCtx(env);

    const res = await worker.fetch(
      new Request('https://jawafdehi.org/search?page=2&utm_source=facebook&type=case'),
      env as never,
      ctx as never,
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('href="/case/namuna-cooperative-fraud/"');
    // Reordered query, tracking parameter dropped: one render, one cache entry.
    expect(fetch.mock.calls[0][0].url).toBe('https://jawafdehi.org/search/?type=case&page=2');
    expect(render).toHaveBeenCalledWith('/search/?type=case&page=2', undefined, { edge: true });
    // Internal edge headers never reach a reader.
    expect(res.headers.get('Cache-Tag')).toBeNull();
  });

  it.each([
    ['a query', '/search/?type=case&q=bribe'],
    ['a filter', '/search/?type=case&tags=land'],
    ['documents', '/search/?type=material'],
    ['the all tab', '/search/'],
  ])('leaves %s to the pre-rendered page, untouched', async (_, path) => {
    const render = vi.spyOn(bundle, 'render');
    const env = makeEnv();
    const { ctx, fetch } = makeCtx(env);

    const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), env as never, ctx as never);

    expect(fetch).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    expect(await res.text()).toContain('static');
  });

  it('falls back to the pre-rendered page when a listing renders no record links', async () => {
    // A clean head over an empty list is still a page that leads nowhere; it
    // must not be served, nor cached for an hour.
    vi.spyOn(bundle, 'render').mockResolvedValue(listingRender('<main><p>Loading…</p></main>') as never);
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/search/?type=entity'), env as never, ctx as never);

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('static');
  });

  it('falls back to the pre-rendered page when the render fails outright', async () => {
    vi.spyOn(bundle, 'render').mockRejectedValue(new Error('search API down'));
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/search/?type=case'), env as never, ctx as never);

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('static');
  });

  it('is switched off with the rest of edge SSR', async () => {
    const render = vi.spyOn(bundle, 'render');
    const env = makeEnv({ EDGE_SSR: 'off' });
    const { ctx, fetch } = makeCtx(env);

    await worker.fetch(new Request('https://jawafdehi.org/search/?type=case'), env as never, ctx as never);

    expect(fetch).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
});
