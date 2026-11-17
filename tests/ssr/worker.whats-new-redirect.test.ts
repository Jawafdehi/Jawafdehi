import { describe, expect, it } from 'vitest';

import worker from '../../worker';

// /whats-new folded into Updates & News. The edge answers it with a permanent
// redirect onto the filter, so crawlers learn it moved and old product links
// (?tag=mcp) still open on their entries.
const env = { ASSETS: { fetch: async () => new Response('not found', { status: 404 }) } };
const get = (path: string) => worker.fetch(new Request(`https://jawafdehi.org${path}`), env as never);

describe('/whats-new', () => {
  it.each([
    ['/whats-new', '/updates?filter=whats-new'],
    ['/whats-new/', '/updates?filter=whats-new'],
    ['/whats-new?tag=mcp', '/updates?filter=whats-new&tag=mcp'],
  ])('%s 301s to %s', async (from, to) => {
    const response = await get(from);
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe(to);
  });
});
