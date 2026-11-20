import { describe, expect, it } from 'vitest';

import worker from '../../worker';

// /whats-new folded into Updates & News, as its product updates. The edge
// answers it with a permanent redirect onto that filter, so crawlers learn it
// moved; an old per-product link (?tag=mcp) lands on all product updates.
const env = { ASSETS: { fetch: async () => new Response('not found', { status: 404 }) } };
const get = (path: string) => worker.fetch(new Request(`https://jawafdehi.org${path}`), env as never);

describe('/whats-new', () => {
  it.each([
    ['/whats-new', '/updates/?filter=product'],
    ['/whats-new/', '/updates/?filter=product'],
    ['/whats-new?tag=mcp', '/updates/?filter=product'],
  ])('%s 301s to %s', async (from, to) => {
    const response = await get(from);
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe(to);
  });
});
