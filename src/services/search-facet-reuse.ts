import type {
  ArchiveSearchParams,
  ArchiveSearchResponse,
} from "@/types/search";

type HeldFacets = Pick<ArchiveSearchResponse, "counts" | "facets" | "extents">;
type Fetcher = (params: ArchiveSearchParams) => Promise<ArchiveSearchResponse>;

/**
 * How long held facets may be reused. Matches the archive query's React Query
 * `staleTime`, so a refetch that React Query considers stale also gets fresh
 * aggregations instead of counts from a page left open for an hour.
 */
export const HELD_FACETS_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Identity of a result set for facet purposes: every param except the page.
 * Facets, type counts and the बिगो extent describe the whole result set, so they
 * are the same on page 1 and page 7 of one search.
 */
export function facetKeyOf(params: ArchiveSearchParams): string {
  const { page: _page, include_facets: _flag, ...rest } = params;
  return JSON.stringify(
    Object.keys(rest)
      .sort()
      .map((name) => [name, rest[name as keyof typeof rest]]),
  );
}

/**
 * Wrap the search fetcher so a later page of a result set we already hold the
 * facets for asks the API to skip its aggregations (`include_facets=false`) and
 * reuses the held ones. The aggregations are most of a search's cost.
 *
 * Edge cases it is built around:
 * - Landing directly on page 3 (a shared link): nothing is held, so it is a
 *   normal full request.
 * - Any change other than the page (query, type, a filter, sort) changes the
 *   key, so the first request of the new result set is a full one.
 * - A failed full request holds nothing, so the next page is full again.
 * - An API that ignores `include_facets` (deployed before this change) still
 *   answers with facets; they are replaced by the identical held ones.
 * - Cursor paging is left alone: the archive pages by offset.
 * - Held facets expire after {@link HELD_FACETS_MAX_AGE_MS}: a page left open
 *   gets fresh aggregations on its next request rather than stale counts.
 */
export function withHeldFacets(
  fetcher: Fetcher,
  now: () => number = Date.now,
): Fetcher {
  let held: { key: string; data: HeldFacets; fetchedAt: number } | null = null;

  return async (params) => {
    const key = facetKeyOf(params);
    const page = params.page ?? 1;
    const fresh =
      held !== null && now() - held.fetchedAt < HELD_FACETS_MAX_AGE_MS;
    if (page > 1 && !params.cursor && held?.key === key && fresh) {
      const reuse = held.data;
      const lean = await fetcher({ ...params, include_facets: false });
      return { ...lean, ...reuse };
    }
    const full = await fetcher(params);
    held = {
      key,
      data: { counts: full.counts, facets: full.facets, extents: full.extents },
      fetchedAt: now(),
    };
    return full;
  };
}
