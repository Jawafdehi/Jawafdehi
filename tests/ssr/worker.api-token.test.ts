// SPDX-License-Identifier: Hippocratic-3.0
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { edgeApiToken, edgeApiTokenNoWait, resetApiTokenCache } from '../../worker/api-token';

const ENV = { EDGE_API_CLIENT_ID: 'sa-edge-ssr', EDGE_API_CLIENT_SECRET: 's3cret' };

function tokenResponse(token = 'tok-1', expiresIn = 43199) {
  return new Response(JSON.stringify({ access_token: token, expires_in: expiresIn }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('edgeApiTokenNoWait', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetApiTokenCache();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.spyOn(console, 'warn').mockRestore();
  });

  it('renders anonymously at once and mints in waitUntil for the next render', async () => {
    let release!: () => void;
    fetchMock.mockImplementation(
      () => new Promise<Response>((resolve) => (release = () => resolve(tokenResponse()))),
    );
    const waited: Promise<unknown>[] = [];

    expect(edgeApiTokenNoWait(ENV, (p) => waited.push(p))).toBeNull();
    expect(waited).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A second miss while the mint is in flight shares it.
    expect(edgeApiTokenNoWait(ENV, (p) => waited.push(p))).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release();
    await Promise.all(waited);
    expect(edgeApiTokenNoWait(ENV, (p) => waited.push(p))).toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does nothing without credentials', () => {
    const waitUntil = vi.fn();
    expect(edgeApiTokenNoWait({}, waitUntil)).toBeNull();
    expect(waitUntil).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('backs off after a failed mint instead of retrying on every miss', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response('nope', { status: 401 }));
    const now = 1_000_000;
    expect(await edgeApiToken(ENV, now)).toBeNull();
    const waitUntil = vi.fn();
    expect(edgeApiTokenNoWait(ENV, waitUntil, now + 1_000)).toBeNull();
    expect(waitUntil).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('re-mints in the background once the cached token is near expiry', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse('tok-1', 600)).mockResolvedValueOnce(tokenResponse('tok-2'));
    const now = 2_000_000;
    expect(await edgeApiToken(ENV, now)).toBe('tok-1');
    // 600 s lifetime minus the 5 min margin: valid for 300 s.
    expect(edgeApiTokenNoWait(ENV, undefined, now + 299_000)).toBe('tok-1');
    const waited: Promise<unknown>[] = [];
    expect(edgeApiTokenNoWait(ENV, (p) => waited.push(p), now + 301_000)).toBeNull();
    await Promise.all(waited);
    expect(edgeApiTokenNoWait(ENV, undefined, now + 302_000)).toBe('tok-2');
  });
});
