import { searchArchive } from "@/services/search-api";
import { CASES_PAGE_SIZE } from "@/lib/cases-pagination";

import type { ArchiveSearchResponse } from "@/types/search";

/**
 * The one definition of the /cases listing query, shared by the client render
 * (pages/Cases.tsx) and the SSR prefetch (entry-server.tsx).
 *
 * Both sites used to hand-maintain the key. #440 dropped `status` from the
 * client's key and not from the server's, so from then on the server filled
 * `['cases-search', {search, status, page}]` while the client read
 * `['cases-search', {search, page}]`. Nothing failed: the prefetch succeeded,
 * the render found no data under its own key, and every /cases and
 * /cases/page/N page was served as a "loading…" skeleton with no case links —
 * which left crawlers no path to the case pages except the sitemap. Same fix as
 * `featuredCasesQuery`: one factory, so the two cannot drift.
 */
export function casesSearchQuery(search: string, page: number) {
  return {
    queryKey: ["cases-search", { search, page }] as const,
    queryFn: (): Promise<ArchiveSearchResponse> =>
      searchArchive({
        q: search || undefined,
        type: "case",
        sort: search ? "relevance" : "newest",
        page_size: CASES_PAGE_SIZE,
        page,
      }),
  };
}
