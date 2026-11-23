// SPDX-License-Identifier: Hippocratic-3.0
// Which search pages the edge renders, so a crawler can walk the archive.
//
// ⚠️ Imported by worker.ts, so RELATIVE imports only — see
// src/utils/archive-search-window.ts and tests/ssr/worker-import-graph.test.ts.
//
// Before this, a crawler had no path into the records at all except the
// sitemap: /search/ is pre-rendered at build time, so EVERY /search URL —
// ?type=case&page=3 included — was answered with the same static file, with no
// results in it and no links to any record. Search Console measured the cost:
// 92 of ~417k URLs had ever appeared in search.
//
// So the edge now renders a small, deliberately bounded set of search pages
// per request: the UNFILTERED listing of one record type, page by page. Those
// pages link to the records and to the next page with real hrefs, so a crawler
// starting at /search/?type=case can reach every case.
//
// What is NOT rendered here, on purpose:
//   - anything with a query, a filter, a sort or a series. Those are an
//     unbounded space of URLs, and PaginationControls' own rule is not to hand a
//     crawler one ("invite the crawler into an unbounded space of filter
//     combinations"). They keep the pre-rendered shell.
//   - documents. Every document page is `noindex`, so a listing of them would
//     spend crawl budget leading to pages we ask search engines to drop.
//   - the "all" tab, which duplicates the three typed ones.
//   - pages past the API's offset window, which 400.
//
// Indexing policy is NOT changed here: ArchiveSearch's own <Seo> still makes
// page 2+ `noindex, follow` and canonicalises to /search/. A crawler is meant to
// walk THROUGH these pages to the records, which `follow` allows; the pages
// themselves were never meant to rank.

import { archiveSearchMaxOffsetResults, archiveSearchPageSize } from "../utils/archive-search-window";

export type ListingType = 'case' | 'entity' | 'courtcase';

export const LISTING_TYPES: readonly ListingType[] = ['case', 'entity', 'courtcase'];

/** The last page the API can serve: past it, offset paging is a 400. */
export const LISTING_MAX_PAGE = Math.floor(archiveSearchMaxOffsetResults / archiveSearchPageSize);

export interface Listing {
  type: ListingType;
  page: number;
}

// Parameters that do not change what a page shows. Carried by links from
// social posts and ads; they must not turn a listing into "filtered".
const IGNORED_PARAMS = /^(utm_[a-z]+|fbclid|gclid|mc_[a-z]+|ref)$/;

/**
 * The crawlable listing a request names, or null when it is anything else.
 * Pure, and shared by the Worker (whether to render) and the page (whether to
 * give its pager real links), so the two cannot disagree about which pages are
 * walkable.
 */
export function crawlableListing(pathname: string, search: string): Listing | null {
  if (pathname.replace(/\/+$/, '') !== '/search') return null;
  const params = new URLSearchParams(search);

  let type: ListingType | null = null;
  let page: number | null = null;
  for (const [key, value] of params) {
    if (IGNORED_PARAMS.test(key)) continue;
    if (key === 'type') {
      // A repeated ?type is ambiguous; ambiguity is not a listing.
      if (type !== null || !(LISTING_TYPES as readonly string[]).includes(value)) return null;
      type = value as ListingType;
    } else if (key === 'page') {
      // Repeated, it is ambiguous — and readParams takes the FIRST value while a
      // loop takes the last, so the edge would render one page and the browser
      // hydrate another. Ambiguity is not a listing.
      if (page !== null || !/^[1-9]\d{0,4}$/.test(value)) return null;
      page = Number(value);
    } else {
      return null; // q, a filter, a sort, a series: not an unfiltered listing
    }
  }
  if (type === null) return null;
  const resolved = page ?? 1;
  if (resolved > LISTING_MAX_PAGE) return null;
  return { type, page: resolved };
}

/**
 * The one URL a listing is rendered and cached under. Normalised, so
 * ?page=1, a trailing ?utm_source and a reordered query all share one render
 * and one cache entry.
 */
export function listingPath(listing: Listing): string {
  return listing.page === 1
    ? `/search/?type=${listing.type}`
    : `/search/?type=${listing.type}&page=${listing.page}`;
}
