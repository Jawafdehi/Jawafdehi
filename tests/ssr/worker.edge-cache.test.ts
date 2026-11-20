// SPDX-License-Identifier: Hippocratic-3.0
import { describe, it, expect } from 'vitest';

import {
  EDGE_CDN_CACHE_CONTROL,
  edgeKindForRoute,
  pageTag,
  pageTags,
  parsePurgeBody,
  routeTail,
  verifyPurgeSignature,
} from '../../worker/edge-cache';

// The tag scheme and the purge signature are a contract with the API's
// edge-purge consumer (JawafdehiAPI case_events). These vectors were computed
// independently in Python (hashlib/hmac) — the API's tests pin the same values.
// If one changes, purges stop matching pages, silently.

describe('pageTag', () => {
  it.each([
    ['case', 'example-slug', 'case:4c2559534418c558d0d56287f2eb70d6'],
    ['entity', 'person/राम-बहादुर', 'entity:945aa0edee340691aa91cd8b797f9e1f'],
    ['material', 'ag/10', 'material:f87cc8b46c00a4d3ba9f89394670386e'],
    ['courtcase', 'achhamdc/078-c1-0053', 'courtcase:b4f78eb6b8d6f5d8e71c688818beac9c'],
  ] as const)('%s %s', async (kind, tail, expected) => {
    expect(await pageTag(kind, tail)).toBe(expected);
  });

  it('adds the type and global tags, deduplicating tails', async () => {
    expect(await pageTags('case', ['example-slug', 'example-slug', ''])).toEqual([
      'case:4c2559534418c558d0d56287f2eb70d6',
      'type:case',
      'ssr:all',
    ]);
  });
});

describe('routes', () => {
  it('maps exactly the four record routes', () => {
    expect(edgeKindForRoute('/case/:id')).toBe('case');
    expect(edgeKindForRoute('/entity/*')).toBe('entity');
    expect(edgeKindForRoute('/material/*')).toBe('material');
    expect(edgeKindForRoute('/courtcase/*')).toBe('courtcase');
    expect(edgeKindForRoute('/updates/:slug')).toBeNull();
    expect(edgeKindForRoute(undefined)).toBeNull();
  });

  it('takes the tail from the right param, without slashes', () => {
    expect(routeTail('case', { id: 'some-slug' })).toBe('some-slug');
    expect(routeTail('material', { '*': 'ag/10/' })).toBe('ag/10');
  });
});

describe('edge freshness', () => {
  // s-maxage or must-revalidate would switch off stale-while-revalidate and
  // stale-if-error in Workers Cache (RFC 9111 §4.2.4).
  it('keeps stale serving possible', () => {
    expect(EDGE_CDN_CACHE_CONTROL).toBe(
      'max-age=3600, stale-while-revalidate=604800, stale-if-error=604800',
    );
    expect(EDGE_CDN_CACHE_CONTROL).not.toMatch(/s-maxage|must-revalidate|proxy-revalidate/);
  });
});

describe('parsePurgeBody', () => {
  it('accepts page, type and global tags', () => {
    const tags = ['case:4c2559534418c558d0d56287f2eb70d6', 'type:material', 'ssr:all'];
    expect(parsePurgeBody(JSON.stringify({ tags }))).toEqual({ ok: true, tags });
  });

  it.each([
    ['not json', 'nope'],
    ['no tags', '{}'],
    ['empty tags', '{"tags":[]}'],
    ['a raw path', '{"tags":["/case/x"]}'],
    ['an unknown kind', '{"tags":["update:4c2559534418c558d0d56287f2eb70d6"]}'],
    ['a short hash', '{"tags":["case:4c25"]}'],
  ])('rejects %s', (_, raw) => {
    expect(parsePurgeBody(raw).ok).toBe(false);
  });

  it('rejects more than 100 tags', () => {
    const tags = Array.from({ length: 101 }, (_, i) => `case:${i.toString(16).padStart(32, '0')}`);
    expect(parsePurgeBody(JSON.stringify({ tags })).ok).toBe(false);
  });
});

describe('verifyPurgeSignature', () => {
  const body = '{"tags":["type:case"]}';
  const signature = 'v1=208de5acb9388bbb84f82c286c870e6e0e1ec1c0afa1e43de73239856a54f78d';
  const base = { secret: 'test-secret', timestamp: '1700000000', signature, body, nowSeconds: 1700000010 };

  it('accepts the API-side signature', async () => {
    expect(await verifyPurgeSignature(base)).toBe(true);
  });

  it('rejects another secret, body or timestamp', async () => {
    expect(await verifyPurgeSignature({ ...base, secret: 'other' })).toBe(false);
    expect(await verifyPurgeSignature({ ...base, body: '{"tags":["ssr:all"]}' })).toBe(false);
    expect(await verifyPurgeSignature({ ...base, timestamp: '1700000001' })).toBe(false);
  });

  it('rejects a stale or future timestamp', async () => {
    expect(await verifyPurgeSignature({ ...base, nowSeconds: 1700000000 + 301 })).toBe(false);
    expect(await verifyPurgeSignature({ ...base, nowSeconds: 1700000000 - 301 })).toBe(false);
  });

  it('rejects malformed or missing input', async () => {
    expect(await verifyPurgeSignature({ ...base, signature: null })).toBe(false);
    expect(await verifyPurgeSignature({ ...base, signature: signature.slice(3) })).toBe(false);
    expect(await verifyPurgeSignature({ ...base, signature: 'v1=zz' })).toBe(false);
    expect(await verifyPurgeSignature({ ...base, timestamp: 'soon' })).toBe(false);
    expect(await verifyPurgeSignature({ ...base, secret: '' })).toBe(false);
  });
});
