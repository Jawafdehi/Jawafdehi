import { searchArchive } from "@/services/search-api";

import type { ArchiveSearchResponse } from "@/types/search";

/** How many case cards the homepage "Featured Cases" grid shows. */
export const FEATURED_CASE_GRID_COUNT = 6;

/** How many cases the homepage fetches: exactly the grid, no spotlight lead. */
export const FEATURED_CASE_COUNT = FEATURED_CASE_GRID_COUNT;

/**
 * The one definition of the homepage featured-cases query, shared by the client
 * render (pages/Index.tsx) and the SSR prefetch (entry-server.tsx).
 *
 * Both sites used to hand-maintain the key and params, with a comment asking the
 * next editor to keep them in sync. Drift there fails quietly rather than loudly:
 * the server fills one cache key and the client asks for another, so the section
 * flashes its skeleton on load despite SSR having already fetched the data. One
 * exported factory makes that class of bug unrepresentable.
 *
 * `sort: "newest"` orders by case date, newest first. The editorial `weight` is
 * deliberately not used: every case gets equal standing on the homepage.
 */
export function featuredCasesQuery() {
  return {
    queryKey: ["home-featured-cases", { page_size: FEATURED_CASE_COUNT }] as const,
    queryFn: (): Promise<ArchiveSearchResponse> =>
      searchArchive({
        type: "case",
        sort: "newest",
        page_size: FEATURED_CASE_COUNT,
      }),
  };
}
