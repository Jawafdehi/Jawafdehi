import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { reportPrefetch, summarisePrefetchFailures } from "@/lib/ssr-prefetch";

/**
 * The pre-render used to publish an empty page instead of failing: every prefetch
 * threw, `prefetchQuery` caught it (that is its documented behaviour), and each
 * route was written with `{"queries":[]}`. Green build, green tests, six skeletons
 * served to crawlers for months. These tests cover the detector that now stands
 * between that failure and a deploy; scripts/pre-render.ts turns it into exit 1.
 */
describe("reportPrefetch", () => {
  const client = () => new QueryClient({ defaultOptions: { queries: { retry: 0 } } });

  it("reports a prefetch that threw, which prefetchQuery itself does not", async () => {
    const queryClient = client();

    // Resolving is the whole problem: awaiting a prefetch proves nothing.
    await expect(
      queryClient.prefetchQuery({
        queryKey: ["statistics"],
        queryFn: () => Promise.reject(new ReferenceError("window is not defined")),
      }),
    ).resolves.toBeUndefined();

    expect(reportPrefetch(queryClient)).toEqual({
      fulfilled: [],
      failed: [
        { queryKey: ["statistics"], reason: "ReferenceError: window is not defined" },
      ],
    });
  });

  it("reports the one query that failed among its siblings", async () => {
    const queryClient = client();

    await Promise.allSettled([
      queryClient.prefetchQuery({ queryKey: ["statistics"], queryFn: async () => ({ cases: 75 }) }),
      queryClient.prefetchQuery({
        queryKey: ["home-featured-cases", { page_size: 6 }],
        queryFn: () => Promise.reject(new Error('"featured" is not a valid choice.')),
      }),
    ]);

    const report = reportPrefetch(queryClient);
    expect(report.fulfilled).toEqual([["statistics"]]);
    expect(report.failed).toEqual([
      {
        queryKey: ["home-featured-cases", { page_size: 6 }],
        reason: '"featured" is not a valid choice.',
      },
    ]);
  });

  it("counts a query that never resolved as failed, not as fine", () => {
    const queryClient = client();
    // What a mounted-but-unfetched useQuery leaves behind — no error, no data.
    // The reason this must be treated as a failure is also the reason render()
    // reports before it renders: see the sibling test below.
    queryClient.getQueryCache().build(queryClient, { queryKey: ["never-fetched"] });

    expect(reportPrefetch(queryClient).failed).toEqual([
      { queryKey: ["never-fetched"], reason: "query is pending" },
    ]);
  });
});

describe("summarisePrefetchFailures", () => {
  it("names every route, key and cause", () => {
    const summary = summarisePrefetchFailures([
      { route: "/", failed: [{ queryKey: ["statistics"], reason: "boom" }] },
      { route: "/cases", failed: [{ queryKey: ["cases-search", { q: "" }], reason: "404" }] },
    ]);

    expect(summary).toBe(
      [
        "2 pre-rendered routes lost data that was prefetched for them:",
        '  / — ["statistics"]: boom',
        '  /cases — ["cases-search",{"q":""}]: 404',
      ].join("\n"),
    );
  });
});
