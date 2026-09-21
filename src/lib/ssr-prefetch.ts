import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** A prefetch that was asked for and did not arrive, with why. */
export interface FailedQuery {
  queryKey: QueryKey;
  reason: string;
}

/** What a route's SSR prefetch asked for, and what it actually delivered. */
export interface PrefetchReport {
  fulfilled: QueryKey[];
  failed: FailedQuery[];
}

function describeFailure(error: unknown, status: string): string {
  if (error instanceof Error) {
    return error.name === "Error" ? error.message : `${error.name}: ${error.message}`;
  }
  if (error != null) return String(error);
  // No error and not a success: the fetch never resolved either way.
  return `query is ${status}`;
}

/**
 * Read the outcome of a route's prefetches off the query cache.
 *
 * `queryClient.prefetchQuery` resolves even when its `queryFn` throws — it
 * catches by design, so awaiting one tells a caller nothing about whether the
 * data arrived. The failure IS recorded, just only in the cache: the query is
 * built before the fetch starts and left in an `error` state. So the cache, not
 * the return value, is where a broken prefetch is visible at all.
 *
 * MUST be called before `renderToString`. Rendering mounts the tree's `useQuery`
 * hooks, and each one builds its own cache entry — pending, never fetched, since
 * the server has no effects to run. Afterwards those look exactly like prefetches
 * that failed: /courtcases and /search each mount a search query that no
 * prefetch branch fills, so a report taken after the render would fail the
 * build on pages that are behaving as designed. (/materials used to be the
 * third example, until its landing page gained a prefetch branch.)
 */
export function reportPrefetch(queryClient: QueryClient): PrefetchReport {
  const fulfilled: QueryKey[] = [];
  const failed: FailedQuery[] = [];

  for (const query of queryClient.getQueryCache().getAll()) {
    if (query.state.status === "success") {
      fulfilled.push(query.queryKey);
    } else {
      failed.push({
        queryKey: query.queryKey,
        reason: describeFailure(query.state.error, query.state.status),
      });
    }
  }

  return { fulfilled, failed };
}

export interface RoutePrefetchFailure {
  route: string;
  failed: readonly FailedQuery[];
}

/** Names every route, key and cause, so the build log is enough to start from. */
export function summarisePrefetchFailures(
  failures: readonly RoutePrefetchFailure[],
): string {
  const routes = failures.length === 1 ? "route" : "routes";
  return [
    `${failures.length} pre-rendered ${routes} lost data that was prefetched for ${
      failures.length === 1 ? "it" : "them"
    }:`,
    ...failures.flatMap(({ route, failed }) =>
      failed.map(
        ({ queryKey, reason }) => `  ${route} — ${JSON.stringify(queryKey)}: ${reason}`,
      ),
    ),
  ].join("\n");
}
