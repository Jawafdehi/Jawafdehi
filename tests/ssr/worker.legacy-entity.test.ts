import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker from '../../worker';
import { LEGACY_ENTITY_MAP } from '../../src/utils/legacyEntityMap';

// /entity/<id> was the entity URL until July 2026, keyed on a table that no
// longer exists. Google still holds ~90 of them (Search Console: 73 404s and 17
// soft 404s, most of them numeric entity URLs). Each now gets a definite answer:
// a 301 where the entity can be identified today, 410 Gone otherwise.

const INDEX_HTML = '<!doctype html><html><head><title>Jawafdehi</title></head><body></body></html>';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response(INDEX_HTML, { status: 200, headers: { 'content-type': 'text/html' } })
          : new Response('not found', { status: 404 }),
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } });
  // No API call is expected on these paths; fail loudly if one is made.
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('unexpected upstream fetch'); }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('legacy numeric entity URLs', () => {
  it.each(['/entity/1173', '/entity/1173/'])('301s an identified entity (%s) to its current page', async (path) => {
    const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), makeEnv());

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/entity/person/sher-bahadur-deuba/');
  });

  it.each(['/entity/2119', '/entity/2119/', '/entity/1131'])('answers 410 Gone for an unidentified one (%s)', async (path) => {
    const res = await worker.fetch(new Request(`https://jawafdehi.org${path}`), makeEnv());

    expect(res.status).toBe(410);
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
    // The SPA shell, so a reader still sees the NotFound page, not a bare error.
    expect(await res.text()).toContain('<title>Jawafdehi</title>');
  });

  it('maps only to slash-terminated entity record paths', () => {
    for (const target of Object.values(LEGACY_ENTITY_MAP)) {
      expect(target).toMatch(/^\/entity\/[a-z0-9_-]+(\/[a-z0-9_-]+)+\/$/);
    }
  });

  it('leaves IRI-shaped entity paths alone', async () => {
    const res = await worker.fetch(new Request('https://jawafdehi.org/entity/2070-b-s/foo/'), makeEnv());
    expect([301, 410]).not.toContain(res.status);
  });
});
