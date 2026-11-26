import { useQuery } from "@tanstack/react-query";

import { getSeries } from "@/services/series-api";

/**
 * The one definition of the series-detail query, shared by the series page and
 * the case page's series banner (which needs the member list for its
 * previous/next links), so both read the same cache entry.
 */
export function seriesQuery(slug: string) {
  return {
    queryKey: ["series", slug] as const,
    queryFn: () => getSeries(slug),
  };
}

/**
 * The series detail. `enabled: false` (no slug) never fetches; the case
 * banner passes the slug only once the case says it belongs to a series.
 */
export function useSeries(slug: string | null | undefined) {
  return useQuery({
    ...seriesQuery(slug ?? ""),
    enabled: Boolean(slug),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
