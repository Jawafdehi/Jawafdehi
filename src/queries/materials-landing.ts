import { getStatistics } from "@/services/jds-api";
import { searchArchive } from "@/services/search-api";

import type { ArchiveSearchResponse } from "@/types/search";

/**
 * The /materials landing page's queries, shared verbatim by the client render
 * (pages/MaterialsLanding.tsx) and the SSR prefetch (entry-server.tsx) — the
 * same single-definition contract as queries/home.ts. Every figure the page
 * shows comes from one of these.
 */

/** How many documents the "recently added" carousel shows. */
export const RECENT_MATERIALS_COUNT = 4;

/**
 * Fetch a window well past the display count: `sort=newest` compares the raw
 * date field, and some sources store BS dates there (year 2082 sorts as a
 * future AD year), so the true newest documents sit a little deeper in the
 * list. lib/materials-landing re-sorts on resolved dates client-side.
 */
export const RECENT_MATERIALS_WINDOW = 24;

/** Same key as the home hero and /data-quality: one statistics cache entry. */
export function archiveStatisticsQuery() {
  return {
    queryKey: ["statistics"] as const,
    queryFn: getStatistics,
  };
}

export function recentMaterialsQuery() {
  return {
    queryKey: ["materials-recent", { window: RECENT_MATERIALS_WINDOW }] as const,
    queryFn: (): Promise<ArchiveSearchResponse> =>
      searchArchive({
        type: "material",
        sort: "newest",
        page_size: RECENT_MATERIALS_WINDOW,
      }),
  };
}
