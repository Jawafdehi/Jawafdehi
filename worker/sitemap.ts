// SPDX-License-Identifier: Hippocratic-3.0
// jawafdehi.org/sitemap*.xml, served from the API (JAW-80, design S1).
//
// The API's discovery app owns the record list: a sitemap index at
// api.jawafdehi.org/sitemap.xml with one child per record type, 50k URLs per
// child file, listing only what is public (PUBLISHED cases, LISTED materials,
// name-gated court cases, live entities), every <loc> already on jawafdehi.org.
// The Worker proxies it under the site's own host — crawlers only trust a
// sitemap for URLs on the host that serves it — and adds one child the API does
// not know about: /sitemap-site.xml, the site's own pages (home, about, the case
// browse pages, updates), written by scripts/sitemap.ts at build time and served
// as a static asset.

export const API_ORIGIN = 'https://api.jawafdehi.org';
export const SITE_SITEMAP_LOC = 'https://jawafdehi.org/sitemap-site.xml';

// One hour at the edge, a day of stale-while-revalidate, a week of
// stale-if-error: the API's own sitemap cache follows an hourly stats refresh,
// and a crawler is better served a day-old index than a 503.
export const SITEMAP_CDN_CACHE_CONTROL =
  'max-age=3600, stale-while-revalidate=86400, stale-if-error=604800';
export const SITEMAP_BROWSER_CACHE_CONTROL = 'public, max-age=3600';

/** The index and one child page can take a while to build on a cold API cache. */
export const SITEMAP_FETCH_TIMEOUT_MS = 25_000;

const INDEX_RE = /^\/sitemap\.xml$/;
// `site` is ours (a static asset), never the API's.
const CHILD_RE = /^\/sitemap-(?!site\.xml$)([a-z0-9_-]{1,40})\.xml$/;

/**
 * The API path (with the only query parameter it honours, `p`) for a sitemap
 * request, or null when the path is not a proxied sitemap. The path is also the
 * cache key, so anything else in the query string is dropped rather than
 * allowed to split the cache.
 */
export function sitemapUpstreamPath(pathname: string, search: string): string | null {
  if (!INDEX_RE.test(pathname) && !CHILD_RE.test(pathname)) return null;
  const page = new URLSearchParams(search).get('p');
  if (page === null) return pathname;
  if (!/^[1-9]\d{0,4}$/.test(page)) return null;
  return `${pathname}?p=${page}`;
}

/** Add the site's own child sitemap to the API's index, once. */
export function withSiteSitemap(indexXml: string): string {
  if (indexXml.includes(SITE_SITEMAP_LOC)) return indexXml;
  const close = indexXml.lastIndexOf('</sitemapindex>');
  if (close === -1) return indexXml;
  const entry = `<sitemap><loc>${SITE_SITEMAP_LOC}</loc></sitemap>`;
  return `${indexXml.slice(0, close)}${entry}${indexXml.slice(close)}`;
}
