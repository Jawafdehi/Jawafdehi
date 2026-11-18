// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker from '../../worker';

// Case and entity pages are canonical WITH a trailing slash. The build used to
// pre-render them to <path>/index.html, which made the assets binding 307 the
// slashless form; now the edge renders them and nothing is on disk, so the
// Worker issues that redirect itself — a 301, before any rendering happens.

const INDEX_HTML = '<!doctype html><html><head><title>Jawafdehi</title></head><body></body></html>';

function makeEnv() {
  return {
    EDGE_SSR: 'off',
    ASSETS: {
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } })
          : new Response('not found', { status: 404 }),
    },
  };
}

let upstream: ReturnType<typeof vi.fn>;

beforeEach(() => {
  upstream = vi.fn(async () => new Response(JSON.stringify({ title: 'x', slug: 'x' }), { status: 200 }));
  vi.stubGlobal('fetch', upstream);
  vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const get = (path: string, init?: RequestInit) =>
  worker.fetch(new Request(`https://jawafdehi.org${path}`, init), makeEnv() as never, {} as never);

describe('slashless case and entity URLs 301 to the slashed canonical form', () => {
  it.each([
    ['/case/a-case', '/case/a-case/'],
    ['/entity/person/ram-shah', '/entity/person/ram-shah/'],
    ['/entity/organization/np/tu', '/entity/organization/np/tu/'],
    ['/case/a-case?utm_source=fb&x=1', '/case/a-case/?utm_source=fb&x=1'],
    ['/entity/person/%E0%A4%B0%E0%A4%BE%E0%A4%AE', '/entity/person/%E0%A4%B0%E0%A4%BE%E0%A4%AE/'],
  ])('%s → %s', async (from, to) => {
    const res = await get(from);

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe(to);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    // Decided from the path alone: no API call, no render.
    expect(upstream).not.toHaveBeenCalled();
  });

  it('redirects HEAD the same way', async () => {
    const res = await get('/case/a-case', { method: 'HEAD' });
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/case/a-case/');
  });

  it('leaves other methods alone', async () => {
    const res = await get('/case/a-case', { method: 'POST' });
    expect(res.status).not.toBe(301);
  });

  it('never emits a protocol-relative Location', async () => {
    const res = await get('//case/a-case');
    if (res.status === 301) {
      expect(res.headers.get('Location')!.startsWith('//')).toBe(false);
    }
  });

  it('does not redirect the slashed form', async () => {
    const res = await get('/case/a-case/');
    expect(res.status).not.toBe(301);
  });

  it.each([
    '/material/document/oag-11353',
    '/courtcase/achhamdc/078-c1-0053',
    '/cases',
    '/about',
  ])('leaves %s (canonical without a slash) alone', async (path) => {
    const res = await get(path);
    expect(res.status).not.toBe(301);
  });

  it('runs after the legacy numeric redirect, so that stays one hop', async () => {
    const res = await get('/case/238');
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/case/case-081-cr-0060-681d9859/');
  });
});
