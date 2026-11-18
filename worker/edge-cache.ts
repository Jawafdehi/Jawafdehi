// SPDX-License-Identifier: Hippocratic-3.0
// Edge SSR cache vocabulary: which pages are rendered at the edge, how their
// cached copies are tagged, and how a purge request from the API is checked.
//
// Pure functions over Web Crypto and strings, so the Worker and the unit tests
// run the same code. The tag scheme and the signature are a CONTRACT with the
// API (JawafdehiAPI `case_events` edge-purge consumer): change one side and the
// purges silently stop matching. The test vectors in
// tests/ssr/worker.edge-cache.test.ts are the shared reference.

/** The record pages the Worker renders on request. */
export type EdgeKind = 'case' | 'entity' | 'material' | 'courtcase';

export const EDGE_KINDS: readonly EdgeKind[] = ['case', 'entity', 'material', 'courtcase'];

const KIND_BY_ROUTE: Record<string, EdgeKind> = {
  '/case/:id': 'case',
  '/entity/*': 'entity',
  '/material/*': 'material',
  '/courtcase/*': 'courtcase',
};

/**
 * Edge freshness for a rendered page, read by Workers Cache only.
 *
 * Sent as `Cloudflare-CDN-Cache-Control`, which Cloudflare consumes and strips,
 * rather than as `Cache-Control`: a purge reaches the edge but never a browser,
 * so the browser copy (CACHE_CONTROL_BROWSER) stays short while the edge holds
 * the page for an hour, serves it stale for up to 7 days while it re-renders in
 * the background, and keeps serving it for 7 days when a re-render fails (an
 * API outage). The hour is only a backstop: purge-on-change is what keeps a
 * changed case fresh.
 *
 * No `s-maxage` / `must-revalidate`: either one disables stale-while-revalidate
 * and stale-if-error in Workers Cache (RFC 9111 §4.2.4).
 */
export const EDGE_CDN_CACHE_CONTROL =
  'max-age=3600, stale-while-revalidate=604800, stale-if-error=604800';

/** What a browser may keep. Matches the meta-injection shell's existing TTL. */
export const CACHE_CONTROL_BROWSER = 'public, max-age=300';

/** For the fallback shell served when a render failed and nothing was cached. */
export const CACHE_CONTROL_FALLBACK = 'public, max-age=60';

export function edgeKindForRoute(routePath: string | undefined): EdgeKind | null {
  return (routePath && KIND_BY_ROUTE[routePath]) || null;
}

/**
 * The record's tail: the percent-decoded path after `/<kind>/`, with no leading
 * or trailing slash. `matchRoute` already hands params back decoded.
 */
export function routeTail(kind: EdgeKind, params: Record<string, string | undefined>): string {
  const raw = kind === 'case' ? params.id : params['*'];
  return (raw ?? '').replace(/^\/+|\/+$/g, '');
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The Cache-Tag for one page: `<kind>:<first 32 hex of sha256("<kind>/<tail>")>`.
 *
 * Hashed rather than the tail itself because Cache-Tag values must be printable
 * ASCII with no spaces, and tails are not: entity slugs and material idents can
 * be Devanagari, and idents can carry spaces. A hash is also the one encoding
 * Python and JavaScript cannot disagree about, where percent-encoding has a
 * different safe set in each.
 */
export async function pageTag(kind: EdgeKind, tail: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${kind}/${tail}`));
  return `${kind}:${toHex(digest).slice(0, 32)}`;
}

/** Tags for a rendered page: the record(s), its kind, and the global SSR tag. */
export async function pageTags(kind: EdgeKind, tails: readonly string[]): Promise<string[]> {
  const unique = [...new Set(tails.filter(Boolean))];
  const recordTags = await Promise.all(unique.map((tail) => pageTag(kind, tail)));
  return [...recordTags, `type:${kind}`, 'ssr:all'];
}

const TAG_RE = /^(?:(?:case|entity|material|courtcase):[0-9a-f]{32}|type:(?:case|entity|material|courtcase)|ssr:all)$/;

/** Cloudflare's per-call purge limit is 100 tags. */
export const MAX_PURGE_TAGS = 100;

/** How far a purge request's timestamp may be from the Worker's clock. */
export const PURGE_MAX_SKEW_SECONDS = 300;

export type PurgeBodyResult = { ok: true; tags: string[] } | { ok: false; error: string };

export function parsePurgeBody(raw: string): PurgeBodyResult {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'body is not JSON' };
  }
  const tags = (body as { tags?: unknown } | null)?.tags;
  if (!Array.isArray(tags) || tags.length === 0) return { ok: false, error: 'tags must be a non-empty list' };
  if (tags.length > MAX_PURGE_TAGS) return { ok: false, error: `at most ${MAX_PURGE_TAGS} tags per call` };
  if (!tags.every((tag) => typeof tag === 'string' && TAG_RE.test(tag))) {
    return { ok: false, error: 'unknown tag format' };
  }
  return { ok: true, tags: [...new Set(tags as string[])] };
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/.test(hex)) return null;
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Check `X-Jawafdehi-Signature: v1=<hex HMAC-SHA256(secret, "<timestamp>.<body>")>`.
 *
 * `crypto.subtle.verify` compares in constant time, so the signature is never
 * compared with `===`. The timestamp bounds replay to PURGE_MAX_SKEW_SECONDS; a
 * replayed purge can only re-purge the same pages, which costs a re-render.
 */
export async function verifyPurgeSignature(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds: number;
}): Promise<boolean> {
  const { secret, timestamp, signature, body, nowSeconds } = input;
  if (!secret || !timestamp || !signature) return false;
  if (!/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > PURGE_MAX_SKEW_SECONDS) return false;
  const match = /^v1=([0-9a-f]{64})$/.exec(signature.trim());
  const expected = match && fromHex(match[1]);
  if (!expected) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, expected, new TextEncoder().encode(`${timestamp}.${body}`));
}
