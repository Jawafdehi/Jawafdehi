import { describe, it, expect } from 'vitest';

import worker from '../../worker';

// The social card shipped under two byte-identical names: /og-favicon.png (the
// original) and /assets/social-preview.png (what every page references now).
// Deleting the duplicate would silently break any share already cached against
// the old filename, so the Worker 301s it to the current card instead.
//
// The redirect is only reachable because the file is gone — the assets binding
// answers before the Worker on any path it holds. These tests assert the
// redirect, and that a path the assets binding DOES hold is left alone.

function makeEnv(heldPaths: string[] = []) {
  return {
    ASSETS: {
      fetch: async (req: Request) => {
        const path = new URL(req.url).pathname;
        if (heldPaths.includes(path)) {
          return new Response('a real asset', {
            status: 200,
            headers: { 'content-type': 'image/png' },
          });
        }
        return new Response('not found', { status: 404 });
      },
    },
  };
}

async function get(path: string, heldPaths?: string[]) {
  return worker.fetch(
    new Request(`https://jawafdehi.org${path}`),
    makeEnv(heldPaths) as never,
    {} as never,
  );
}

describe('the retired social-card filename', () => {
  it('301s /og-favicon.png to the card the site actually references', async () => {
    const res = await get('/og-favicon.png');

    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/assets/social-preview.png');
  });

  it('is cacheable, so scrapers do not re-ask on every share', async () => {
    const res = await get('/og-favicon.png');

    expect(res.headers.get('cache-control')).toContain('max-age=86400');
  });

  it('does not redirect the card that replaced it', async () => {
    const res = await get('/assets/social-preview.png', ['/assets/social-preview.png']);

    expect(res.status).toBe(200);
  });
});
