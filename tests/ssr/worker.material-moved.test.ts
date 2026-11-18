import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker from '../../worker';

// A re-filed material (JAW-81). The API keeps the old address alive as a 301 to
// the document's current one; the site page must do the same, or every link
// already shared to the old /material/<source>/<ident> lands on a page that
// renders the moved document under its OLD canonical — or, if the Worker
// followed the redirect blindly, hides the move from crawlers entirely.

const OLD_PATH = '/material/court_filing/20260428.055adaa6';
const NEW_TAIL = 'news/janaaastha.167330';

function makeEnv() {
  return {
    ASSETS: {
      // Only the shell exists; /material/* is never a static asset.
      fetch: async (req: Request) =>
        new URL(req.url).pathname === '/'
          ? new Response('<!doctype html><html><head><title>x</title></head><body></body></html>', {
              status: 200,
              headers: { 'content-type': 'text/html' },
            })
          : new Response('not found', { status: 404 }),
    },
  };
}

type Init = RequestInit & { redirect?: RequestRedirect };

/** The API answers the old address with a 301, as materials/views.py does. */
function stubMovedApi(location: string, status = 301) {
  const calls: { url: string; init?: Init }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: Request | string, init?: Init) => {
      calls.push({ url: typeof input === 'string' ? input : input.url, init });
      return new Response(null, { status, headers: { Location: location } });
    }),
  );
  return calls;
}

let store: Map<string, Response>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('caches', {
    default: {
      match: async (req: Request) => store.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => {
        store.set(req.url, res);
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function get(path: string) {
  return worker.fetch(
    new Request(`https://jawafdehi.org${path}`),
    makeEnv() as never,
    {} as never,
  );
}

describe('a moved material page', () => {
  it('301s the old page to the new one', async () => {
    const calls = stubMovedApi(`/api/materials/${NEW_TAIL}`);

    const res = await get(OLD_PATH);

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe(`https://jawafdehi.org/material/${NEW_TAIL}`);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    // The Worker must SEE the redirect rather than follow it.
    expect(calls[0].init?.redirect).toBe('manual');
  });

  it('keeps the reader\'s query string', async () => {
    stubMovedApi(`/api/materials/${NEW_TAIL}`);
    const res = await get(`${OLD_PATH}?table=t1`);
    expect(res.headers.get('Location')).toBe(
      `https://jawafdehi.org/material/${NEW_TAIL}?table=t1`,
    );
  });

  it('accepts an absolute Location and a Devanagari ident', async () => {
    stubMovedApi(
      `https://api.jawafdehi.org/api/materials/news/${encodeURIComponent('जनआस्था')}.1/`,
    );
    const res = await get(OLD_PATH);
    expect(res.headers.get('Location')).toBe(
      `https://jawafdehi.org/material/news/${encodeURIComponent('जनआस्था')}.1`,
    );
  });

  it('is served from the edge cache the second time', async () => {
    const calls = stubMovedApi(`/api/materials/${NEW_TAIL}`);
    await get(OLD_PATH);
    const again = await get(OLD_PATH);
    expect(again.status).toBe(301);
    expect(calls).toHaveLength(1);
  });

  it('does not redirect anywhere but another material page', async () => {
    stubMovedApi('/api/cases/some-case/');
    const res = await get(OLD_PATH);
    expect(res.status).not.toBe(301);
    expect(store.size).toBe(0);
  });

  it('refuses a Location that would climb out of /material/', async () => {
    stubMovedApi('/api/materials/news/..%2F..%2Fcases');
    const res = await get(OLD_PATH);
    expect(res.status).not.toBe(301);
  });
});
