// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker, { EdgePages } from '../../worker';
// The same module instance worker.ts imports as './worker/edge-bundle' (aliased
// in vitest.config.ts), so spying on it drives the Worker's renders.
import { bundle } from '../support/edge-bundle-stub';

// Edge SSR end to end through the Worker, with the runtime parts faked: the
// cached EdgePages entrypoint is reached via ctx.exports, and its cache's purge
// via ctx.cache. The meta-injection fallback is the pre-JAW-80 behaviour and is
// pinned by the other worker.* tests; these pin when the Worker reaches for it.

const INDEX_HTML = '<!doctype html><html><head><title>Jawafdehi</title></head><body></body></html>';

function makeEnv(extra: Record<string, string> = {}) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        if (new URL(req.url).pathname === '/') {
          return new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
        }
        return new Response('not found', { status: 404 });
      },
    },
    ...extra,
  };
}

function renderResult(failed: Array<{ reason: string; status?: number }> = []) {
  return {
    html: '<main><h1>Server-rendered record</h1></main>',
    helmetContext: { helmet: { title: { toString: () => '<title>Record | Jawafdehi</title>' } } },
    dehydratedState: { queries: [] },
    prefetch: { fulfilled: failed.length ? [] : [['record']], failed },
  };
}

// A ctx whose ctx.exports.EdgePages runs the real EdgePages class, the way
// the runtime does minus the cache in between.
function makeCtx(env: ReturnType<typeof makeEnv>, purge = vi.fn(async () => ({ success: true }))) {
  const inner = { cache: { purge } };
  const edgePages = new (EdgePages as unknown as new (ctx: unknown, env: unknown) => EdgePages)(inner, env);
  const fetch = vi.fn((request: Request) => edgePages.fetch(request));
  return { ctx: { exports: { EdgePages: { fetch } }, cache: { purge } }, fetch, purge };
}

function stubApi(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) =>
      handler(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url),
    ),
  );
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('edge SSR record pages', () => {
  it('serves the rendered page with edge cache headers kept from the browser', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult());
    const env = makeEnv();
    const { ctx, fetch } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/entity/person/ram/?utm_source=x'), env, ctx);

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<h1>Server-rendered record</h1>');
    expect(res.headers.get('X-Edge-SSR')).toBe('render');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    // Cache-only headers never reach the reader.
    expect(res.headers.get('Cache-Tag')).toBeNull();
    expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    // One cache key per record: no query string, no forwarded headers.
    const forwarded = fetch.mock.calls[0][0] as Request;
    expect(forwarded.url).toBe('https://jawafdehi.org/entity/person/ram');
    expect(forwarded.headers.get('Cookie')).toBeNull();
  });

  it('gives Workers Cache the edge TTL and the record tags', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult());
    const env = makeEnv();
    const edgePages = new (EdgePages as unknown as new (ctx: unknown, env: unknown) => EdgePages)({ cache: {} }, env);

    const res = await edgePages.fetch(new Request('https://jawafdehi.org/material/ag/10'));

    expect(res.headers.get('Cloudflare-CDN-Cache-Control')).toBe(
      'max-age=3600, stale-while-revalidate=604800, stale-if-error=604800',
    );
    expect(res.headers.get('Cache-Tag')).toBe('material:f87cc8b46c00a4d3ba9f89394670386e,type:material,ssr:all');
  });

  it('renders a case series and tags it with the series contract', async () => {
    const render = vi.spyOn(bundle, 'render').mockResolvedValue(renderResult());
    const env = makeEnv();
    const edgePages = new (EdgePages as unknown as new (ctx: unknown, env: unknown) => EdgePages)({ cache: {} }, env);

    const res = await edgePages.fetch(new Request('https://jawafdehi.org/series/deepak-bhatta-affair/'));

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Edge-SSR')).toBe('render');
    // The same vector the API's edge-purge consumer sends for this series.
    expect(res.headers.get('Cache-Tag')).toBe('series:857533fe762abc4c45d4742b25551304,type:series,ssr:all');
    expect(render.mock.calls[0][0]).toBe('/series/deepak-bhatta-affair');
  });

  it('serves a rendered series through the gateway like a case', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult());
    const env = makeEnv();
    const { ctx, fetch } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/series/deepak-bhatta-affair/'), env, ctx);

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<h1>Server-rendered record</h1>');
    expect(res.headers.get('Cache-Tag')).toBeNull();
    expect((fetch.mock.calls[0][0] as Request).url).toBe('https://jawafdehi.org/series/deepak-bhatta-affair');
  });

  it('404s a series the API does not serve', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult([{ reason: 'Not found', status: 404 }]));
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/series/no-such-series/'), env, ctx);

    expect(res.status).toBe(404);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('falls back to the client-rendered shell when a series render fails', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult([{ reason: 'Request failed', status: 502 }]));
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/series/deepak-bhatta-affair/'), env, ctx);

    // The SPA shell (the browser renders the series itself), as a temporary
    // 503 a crawler will retry, never cached.
    expect(res.status).toBe(503);
    expect(await res.text()).toBe(INDEX_HTML);
    expect(res.headers.get('X-Edge-SSR')).toBe('fallback-error');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('answers 5xx from EdgePages on a timeout, so the cache can serve its stale copy', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult([{ reason: 'timeout of 4000ms exceeded' }]));
    const edgePages = new (EdgePages as unknown as new (ctx: unknown, env: unknown) => EdgePages)({}, makeEnv());
    const res = await edgePages.fetch(new Request('https://jawafdehi.org/material/ag/10'));
    expect(res.status).toBe(504);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('falls back to the meta-injection shell, with a short TTL, when nothing is cached', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult([{ reason: 'timeout of 4000ms exceeded' }]));
    stubApi(
      () =>
        new Response(JSON.stringify({ slug: 'some-case', title: 'Some case', state: 'PUBLISHED' }), {
          status: 200,
        }),
    );
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/case/some-case/'), env, ctx);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Edge-SSR')).toBe('fallback-timeout');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(await res.text()).toContain('Some case | Jawafdehi');
  });

  // The shell is the pre-rendered HOMEPAGE (title, description, canonical=/).
  // Served at 200 under a record URL, it told crawlers the record duplicated
  // the home page. 503 + Retry-After is temporary to a crawler; a browser still
  // renders the body, and the SPA loads the record itself.
  it('answers 503, uncached, when a route with no meta fallback has no data at all', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult([{ reason: 'Request failed', status: 502 }]));
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/courtcase/achhamdc/078-c1-0053'), env, ctx);

    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('120');
    expect(res.headers.get('X-Edge-SSR')).toBe('fallback-error');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).toBe(INDEX_HTML);
  });

  it('answers 503, not the homepage at 200, when a case render and its meta fallback both fail', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult([{ reason: 'timeout of 4000ms exceeded' }]));
    stubApi(() => new Response('upstream down', { status: 502 }));
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/case/some-case/'), env, ctx);

    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('120');
    expect(res.headers.get('X-Edge-SSR')).toBe('fallback-timeout');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('404s a record the API says does not exist', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue(renderResult([{ reason: 'Not found', status: 404 }]));
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/entity/person/gone/'), env, ctx);

    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it('301s a re-filed material with a host-free Location', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue({
      ...renderResult(),
      dehydratedState: {
        queries: [
          {
            queryKey: ['datalake-material', 'old_source/7'],
            state: { data: { '@id': 'https://jawafdehi.org/material/new_source/7' } },
          },
        ],
      },
    });
    const env = makeEnv();
    const { ctx } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org.np/material/old_source/7'), env, ctx);

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/material/new_source/7');
  });

  it('301s a superseded case slug, and never lets the hop to EdgePages follow it', async () => {
    vi.spyOn(bundle, 'render').mockResolvedValue({
      ...renderResult(),
      dehydratedState: {
        queries: [{ queryKey: ['case', 'old-slug'], state: { data: { slug: 'current-slug' } } }],
      },
    });
    const env = makeEnv();
    const { ctx, fetch } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/case/old-slug/'), env, ctx);

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/case/current-slug/');
    // In the runtime a followed redirect is invisible here: the reader would get
    // the target's render as a 200 under the old URL. This stub cannot follow,
    // so pin the option that stops the runtime from doing it.
    expect((fetch.mock.calls[0][0] as Request).redirect).toBe('manual');
  });

  it('does not render at all when EDGE_SSR is off', async () => {
    const render = vi.spyOn(bundle, 'render');
    stubApi(() => new Response('{}', { status: 500 }));
    const env = makeEnv({ EDGE_SSR: 'off' });
    const { ctx, fetch } = makeCtx(env);

    const res = await worker.fetch(new Request('https://jawafdehi.org/entity/person/ram/'), env, ctx);

    expect(fetch).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    expect(res.headers.get('X-Edge-SSR')).toBeNull();
  });

  it('leaves non-record routes alone', async () => {
    const render = vi.spyOn(bundle, 'render');
    const env = makeEnv();
    const { ctx, fetch } = makeCtx(env);
    await worker.fetch(new Request('https://jawafdehi.org/about'), env, ctx);
    expect(fetch).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });
});

describe('/_cache/purge', () => {
  const SECRET = 'test-secret';
  const BODY = '{"tags":["type:case"]}';
  // HMAC-SHA256("test-secret", "<ts>.<body>"), computed per test with Web Crypto.
  async function sign(ts: string, body: string, secret = SECRET): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${body}`));
    return `v1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  }

  async function purgeRequest(opts: { body?: string; ts?: string; signature?: string; method?: string } = {}) {
    const body = opts.body ?? BODY;
    const ts = opts.ts ?? String(Math.floor(Date.now() / 1000));
    return new Request('https://jawafdehi.org/_cache/purge', {
      method: opts.method ?? 'POST',
      headers: {
        'X-Jawafdehi-Timestamp': ts,
        'X-Jawafdehi-Signature': opts.signature ?? (await sign(ts, body)),
      },
      ...(opts.method === 'GET' ? {} : { body }),
    });
  }

  it('purges the tags through the EdgePages entrypoint', async () => {
    const env = makeEnv({ CACHE_PURGE_SECRET: SECRET });
    const { ctx, fetch, purge } = makeCtx(env);

    const res = await worker.fetch(await purgeRequest(), env, ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, purged: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(purge).toHaveBeenCalledWith({ tags: ['type:case'] });
  });

  it('refuses a bad signature', async () => {
    const env = makeEnv({ CACHE_PURGE_SECRET: SECRET });
    const { ctx, purge } = makeCtx(env);
    const ts = String(Math.floor(Date.now() / 1000));
    const res = await worker.fetch(await purgeRequest({ ts, signature: await sign(ts, BODY, 'wrong') }), env, ctx);
    expect(res.status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it('refuses a stale timestamp', async () => {
    const env = makeEnv({ CACHE_PURGE_SECRET: SECRET });
    const { ctx, purge } = makeCtx(env);
    const res = await worker.fetch(await purgeRequest({ ts: String(Math.floor(Date.now() / 1000) - 3600) }), env, ctx);
    expect(res.status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it('refuses tags outside the scheme', async () => {
    const env = makeEnv({ CACHE_PURGE_SECRET: SECRET });
    const { ctx, purge } = makeCtx(env);
    const res = await worker.fetch(await purgeRequest({ body: '{"tags":["/case/x"]}' }), env, ctx);
    expect(res.status).toBe(400);
    expect(purge).not.toHaveBeenCalled();
  });

  it('is off until the secret is configured', async () => {
    const env = makeEnv();
    const { ctx, purge } = makeCtx(env);
    const res = await worker.fetch(await purgeRequest(), env, ctx);
    expect(res.status).toBe(503);
    expect(purge).not.toHaveBeenCalled();
  });

  it('asks the caller to retry when Cloudflare rejects the purge', async () => {
    const env = makeEnv({ CACHE_PURGE_SECRET: SECRET });
    const { ctx } = makeCtx(
      env,
      vi.fn(async () => ({ success: false, errors: [{ code: 1, message: 'rate limited' }] })),
    );
    const res = await worker.fetch(await purgeRequest(), env, ctx);
    expect(res.status).toBe(429);
  });

  it('refuses an oversized body without buffering it, Content-Length or not', async () => {
    const env = makeEnv({ CACHE_PURGE_SECRET: SECRET });
    const { ctx, purge } = makeCtx(env);
    const chunk = new TextEncoder().encode('x'.repeat(8 * 1024));
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(chunk);
      },
    });
    const res = await worker.fetch(
      new Request('https://jawafdehi.org/_cache/purge', {
        method: 'POST',
        body: stream,
        // @ts-expect-error -- undici needs duplex for a streaming body
        duplex: 'half',
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(413);
    expect(pulled).toBeLessThan(10);
    expect(purge).not.toHaveBeenCalled();
  });

  it('takes POST only', async () => {
    const env = makeEnv({ CACHE_PURGE_SECRET: SECRET });
    const { ctx, fetch } = makeCtx(env);
    const res = await worker.fetch(await purgeRequest({ method: 'GET' }), env, ctx);
    expect(res.status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
});
