// Build-script fetches retry a slow or failing API instead of failing the deploy.
import { describe, expect, it, vi } from 'vitest';

import { fetchWithRetry } from './build-fetch.ts';

const ok = (body = '{}') => new Response(body, { status: 200 });
const status = (code: number) => new Response('', { status: code });
const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

function harness(responses: Array<Response | Error>) {
  const fetchImpl = vi.fn(async () => {
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next!;
  }) as unknown as typeof fetch;
  const sleep = vi.fn(async () => {});
  const log = vi.fn();
  return { fetchImpl, sleep, log };
}

describe('fetchWithRetry', () => {
  it('returns the first answer when it is fine, without waiting', async () => {
    const h = harness([ok('{"a":1}')]);
    const res = await fetchWithRetry('https://api.example/cases/', h);
    expect(await res.json()).toEqual({ a: 1 });
    expect(h.fetchImpl).toHaveBeenCalledTimes(1);
    expect(h.sleep).not.toHaveBeenCalled();
  });

  it('retries a timeout and succeeds on the next try (the build 38a68552 failure)', async () => {
    const h = harness([abortError(), ok()]);
    const res = await fetchWithRetry('https://api.example/cases/?page=2', h);
    expect(res.status).toBe(200);
    expect(h.fetchImpl).toHaveBeenCalledTimes(2);
    expect(h.sleep).toHaveBeenCalledWith(2_000);
    expect(h.log.mock.calls[0][0]).toMatch(/timed out after 30000ms .*page=2.*try 1 of 3/);
  });

  it('retries a 429 or a 5xx, backing off each time', async () => {
    const h = harness([status(503), status(429), ok()]);
    const res = await fetchWithRetry('https://api.example/x', h);
    expect(res.status).toBe(200);
    expect(h.sleep.mock.calls.map((call) => call[0])).toEqual([2_000, 4_000]);
  });

  it('does not retry a 4xx: the answer would not change', async () => {
    const h = harness([status(404)]);
    const res = await fetchWithRetry('https://api.example/x', h);
    expect(res.status).toBe(404);
    expect(h.fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('gives up after the last try with the reason, so a dead API still fails the build', async () => {
    const h = harness([abortError(), abortError(), abortError()]);
    await expect(fetchWithRetry('https://api.example/cases/', h)).rejects.toThrow(
      /timed out after 30000ms fetching https:\/\/api\.example\/cases\/ \(gave up after 3 tries\)/,
    );
    expect(h.fetchImpl).toHaveBeenCalledTimes(3);
    expect(h.sleep).toHaveBeenCalledTimes(2);
  });

  it('hands back the last 5xx rather than throwing, so callers report the status', async () => {
    const h = harness([status(502), status(502), status(502)]);
    const res = await fetchWithRetry('https://api.example/x', h);
    expect(res.status).toBe(502);
  });

  it('retries a network error', async () => {
    const h = harness([new TypeError('fetch failed'), ok()]);
    expect((await fetchWithRetry('https://api.example/x', h)).status).toBe(200);
  });

  it('aborts an attempt that outlives its timeout', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(abortError()));
        }),
    ) as unknown as typeof fetch;
    await expect(
      fetchWithRetry('https://api.example/slow', {
        fetchImpl,
        timeoutMs: 5,
        attempts: 2,
        sleep: async () => {},
        log: () => {},
      }),
    ).rejects.toThrow(/timed out after 5ms .*gave up after 2 tries/);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
