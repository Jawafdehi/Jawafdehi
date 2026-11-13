import { getStatistics } from "@/services/jds-api";

/**
 * The /materials landing page's queries, shared verbatim by the client render
 * (pages/MaterialsLanding.tsx) and the SSR prefetch (entry-server.tsx) — the
 * same single-definition contract as queries/home.ts. Every figure the page
 * shows comes from one of these.
 */

/** Same key as the home hero and /data-quality: one statistics cache entry. */
export function archiveStatisticsQuery() {
  return {
    queryKey: ["statistics"] as const,
    queryFn: getStatistics,
  };
}
