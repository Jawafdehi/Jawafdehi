// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import worker from '../../worker';

// /document-preview proxies ORIGINAL source files (court orders, charge sheets,
// scans) from the buckets and serves them under jawafdehi.org, the one host the
// zone-wide Cloudflare noindex rule exempts. Originals can carry private data,
// so the response itself must say noindex. It used to carry no robots header at
// all: the proxy builds fresh headers and dropped the bucket's own.

const ORIGINAL = 'https://ngm-store.jawafdehi.org/uploads/ciaa/press-releases/files/1235.pdf';

function makeEnv() {
  return {
    ASSETS: {
      fetch: async () => new Response('<!doctype html><html><head></head><body></body></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('%PDF-1.7', {
      status: 200,
      // The bucket's own header, which the proxy must not depend on.
      headers: { 'content-type': 'application/pdf', 'x-robots-tag': 'noindex' },
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('/document-preview', () => {
  it.each(['', '&download=1'])('marks an original document noindex, nofollow, noarchive (%s)', async (extra) => {
    const res = await worker.fetch(
      new Request(`https://jawafdehi.org/document-preview?url=${encodeURIComponent(ORIGINAL)}${extra}`),
      makeEnv(),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow, noarchive');
  });
});
