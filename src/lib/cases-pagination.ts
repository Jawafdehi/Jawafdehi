// The URL shape and arithmetic for browsing /cases, shared by the page, the
// pre-render script and the sitemap so all three agree on which URLs exist.
//
// Why this is a crawlability fix and not a UI preference: /cases used to page
// with `useInfiniteQuery` and a "Load more" button, so pages 2..N had no URL at
// all. Measured against production 2026-10-02, a crawler could reach 19 of 463
// case pages — 12 from this listing, 7 from the home page — and the other 444
// were orphans advertised only in the sitemap. A sitemap is a discovery hint,
// not a path, and Search Console left all of them in "Discovered - currently not
// indexed". Numbered pages give every case an <a href> a crawler can follow.
//
// ⚠️ The page number has to live in the PATH, not a query string. Pre-rendered
// pages are written to dist/<path>/index.html and served by worker.ts through
// ASSETS.fetch, which ignores the query — so /cases/?page=2 would serve page
// one's HTML under a second URL, which is the duplicate-body problem this is
// meant to fix, not a fix for it.

/** Cards per page. Matches the `page_size` the API is asked for. */
export const CASES_PAGE_SIZE = 12;

/** Pages in a result set of `total` cases. Always at least 1, so /cases exists when empty. */
export function casesPageCount(total: number, pageSize: number = CASES_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Canonical path for a page of the case browse.
 *
 * Page 1 is `/cases/`, never `/cases/page/1/` — one page of results must have
 * exactly one URL or the two compete as duplicates. `parseCasesPageParam`
 * rejects an explicit `1` for the same reason.
 */
export function casesPagePath(page: number): string {
  return page <= 1 ? "/cases/" : `/cases/page/${page}/`;
}

/**
 * The `:page` route param as a page number, or `null` if it is not one.
 *
 * Strict on purpose — `/cases/page/abc`, `/cases/page/0`, `/cases/page/2.5`
 * and `/cases/page/01` are all rejected rather than coerced, so a typo 404s
 * instead of silently serving page one under an unbounded family of URLs that
 * a crawler would then index.
 */
export function parseCasesPageParam(raw: string | undefined): number | null {
  if (raw === undefined) return 1;
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const page = Number(raw);
  // Page 1 has its own URL (/cases/), so /cases/page/1 is not a second name for it.
  return page === 1 ? null : page;
}

/** Every page path for a result set of `total` cases, page 1 first. */
export function casesPagePaths(total: number, pageSize: number = CASES_PAGE_SIZE): string[] {
  return Array.from({ length: casesPageCount(total, pageSize) }, (_, index) =>
    casesPagePath(index + 1),
  );
}
