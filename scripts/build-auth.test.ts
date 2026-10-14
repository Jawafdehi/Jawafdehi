// The build's credential: how it is minted, and when it refuses.
//
// The failure this guards against is a quiet one. If a dropped CI secret made
// the build fall back to anonymous, nothing would look wrong until the request
// count crossed the 1000/hour anon cap — at which point the symptom is a wall of
// 429s eight minutes into a deploy, which reads like an API outage rather than a
// missing environment variable.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

/** Fresh module per test: the token promise is memoized at module scope. */
async function loadBuildAuth() {
  vi.resetModules();
  return import('./build-auth.ts');
}

beforeEach(() => {
  delete process.env.PRERENDER_CLIENT_ID;
  delete process.env.PRERENDER_CLIENT_SECRET;
  delete process.env.PRERENDER_TOKEN_ENDPOINT;
  delete process.env.PRERENDER_AUDIENCE;
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

function stubTokenEndpoint(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'tok-abc' }),
    ...response,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('hasBuildCredentials', () => {
  it('is false with no credentials configured', async () => {
    const { hasBuildCredentials } = await loadBuildAuth();
    expect(hasBuildCredentials()).toBe(false);
  });

  it('is false when only one half is set', async () => {
    process.env.PRERENDER_CLIENT_ID = 'sa-prerender';
    const { hasBuildCredentials } = await loadBuildAuth();
    expect(hasBuildCredentials()).toBe(false);
  });

  it('ignores whitespace-only values', async () => {
    process.env.PRERENDER_CLIENT_ID = '  ';
    process.env.PRERENDER_CLIENT_SECRET = '  ';
    const { hasBuildCredentials } = await loadBuildAuth();
    expect(hasBuildCredentials()).toBe(false);
  });

  it('is true with both halves set', async () => {
    process.env.PRERENDER_CLIENT_ID = 'sa-prerender';
    process.env.PRERENDER_CLIENT_SECRET = 'shh';
    const { hasBuildCredentials } = await loadBuildAuth();
    expect(hasBuildCredentials()).toBe(true);
  });
});

describe('buildAuthToken', () => {
  it('resolves null without credentials, and asks for no token', async () => {
    const fetchMock = stubTokenEndpoint({});
    const { buildAuthToken } = await loadBuildAuth();

    await expect(buildAuthToken()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mints a token with the audience URN and the roles scope', async () => {
    // Both are load-bearing: the URN puts `aud` on the token, the roles scope is
    // what makes the prerender role visible. Without either, the build
    // authenticates and then lands in the ordinary user throttle bucket.
    process.env.PRERENDER_CLIENT_ID = 'sa-prerender';
    process.env.PRERENDER_CLIENT_SECRET = 'shh';
    const fetchMock = stubTokenEndpoint({});
    const { buildAuthToken } = await loadBuildAuth();

    await expect(buildAuthToken()).resolves.toBe('tok-abc');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://auth.jawafdehi.org/oauth/v2/token');
    expect(init.method).toBe('POST');
    const body = new URLSearchParams(init.body as URLSearchParams);
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('scope')).toContain(
      'urn:zitadel:iam:org:project:id:377760393168159088:aud',
    );
    expect(body.get('scope')).toContain('urn:zitadel:iam:org:projects:roles');
  });

  it('mints once per process even under concurrent callers', async () => {
    // pre-render.ts fans out to CONCURRENCY workers; a per-call mint would
    // multiply token requests by the fan-out width.
    process.env.PRERENDER_CLIENT_ID = 'sa-prerender';
    process.env.PRERENDER_CLIENT_SECRET = 'shh';
    const fetchMock = stubTokenEndpoint({});
    const { buildAuthToken } = await loadBuildAuth();

    await Promise.all([buildAuthToken(), buildAuthToken(), buildAuthToken()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws rather than silently falling back to anonymous', async () => {
    process.env.PRERENDER_CLIENT_ID = 'sa-prerender';
    process.env.PRERENDER_CLIENT_SECRET = 'wrong';
    stubTokenEndpoint({ ok: false, status: 401 });
    const { buildAuthToken } = await loadBuildAuth();

    await expect(buildAuthToken()).rejects.toThrow(/401/);
  });

  it('does not put the response body in the error', async () => {
    // A failing token endpoint can echo request parameters, and this runs in CI
    // logs that are not private.
    process.env.PRERENDER_CLIENT_ID = 'sa-prerender';
    process.env.PRERENDER_CLIENT_SECRET = 'hunter2';
    stubTokenEndpoint({
      ok: false,
      status: 400,
      json: async () => ({ error_description: 'client_secret=hunter2 rejected' }),
    });
    const { buildAuthToken } = await loadBuildAuth();

    await expect(buildAuthToken()).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') }),
    );
  });

  it('throws when the endpoint answers 200 with no access_token', async () => {
    process.env.PRERENDER_CLIENT_ID = 'sa-prerender';
    process.env.PRERENDER_CLIENT_SECRET = 'shh';
    stubTokenEndpoint({ json: async () => ({ token_type: 'Bearer' }) });
    const { buildAuthToken } = await loadBuildAuth();

    await expect(buildAuthToken()).rejects.toThrow(/no access_token/);
  });
});

describe('buildAuthHeaders', () => {
  it('is empty when anonymous, so callers can spread it unconditionally', async () => {
    const { buildAuthHeaders } = await loadBuildAuth();
    await expect(buildAuthHeaders()).resolves.toEqual({});
  });

  it('carries the bearer when credentials are configured', async () => {
    process.env.PRERENDER_CLIENT_ID = 'sa-prerender';
    process.env.PRERENDER_CLIENT_SECRET = 'shh';
    stubTokenEndpoint({});
    const { buildAuthHeaders } = await loadBuildAuth();

    await expect(buildAuthHeaders()).resolves.toEqual({ Authorization: 'Bearer tok-abc' });
  });
});
