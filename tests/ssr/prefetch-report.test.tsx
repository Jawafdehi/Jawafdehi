import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { searchArchiveMock, getStatisticsMock } = vi.hoisted(() => ({
  searchArchiveMock: vi.fn(),
  getStatisticsMock: vi.fn(),
}));

vi.mock("@/services/search-api", () => ({ searchArchive: searchArchiveMock }));
vi.mock("@/services/jds-api", () => ({
  getStatistics: getStatisticsMock,
  getCaseById: vi.fn(),
}));

const { render } = await import("@/entry-server");
const { default: App } = await import("@/App");
const { ThemeProvider } = await import("@/components/ThemeProvider");
const { reportPrefetch } = await import("@/lib/ssr-prefetch");
const { featuredCasesQuery } = await import("@/queries/home");

const FEATURED_KEY = [...featuredCasesQuery().queryKey];

beforeEach(() => {
  searchArchiveMock.mockReset();
  getStatisticsMock.mockReset();
});

describe("what render() reports about its own prefetch", () => {
  it("reports nothing failed when the homepage got both of its queries", async () => {
    getStatisticsMock.mockResolvedValue({ total_cases: 75 });
    searchArchiveMock.mockResolvedValue({ results: [], count: 0 });

    const { prefetch } = await render("/");

    expect(prefetch.failed).toEqual([]);
    expect(prefetch.fulfilled).toEqual(
      expect.arrayContaining([["statistics"], FEATURED_KEY]),
    );
  });

  it("names the one query that failed while its sibling succeeded", async () => {
    getStatisticsMock.mockResolvedValue({ total_cases: 75 });
    searchArchiveMock.mockRejectedValue(new Error("Request failed with status code 400"));

    // render() still resolves, and the HTML is still valid — which is exactly why
    // the build could not tell this apart from a good render until now.
    const { html, prefetch } = await render("/");

    expect(html.length).toBeGreaterThan(0);
    expect(prefetch.fulfilled).toEqual([["statistics"]]);
    expect(prefetch.failed).toEqual([
      { queryKey: FEATURED_KEY, reason: "Request failed with status code 400" },
    ]);
  });
});

describe("why the report is taken before the render, not after", () => {
  // /courtcases is pre-rendered and has no prefetch branch at all: its search
  // query is mounted by the page itself. Nothing on the server fetches it, so it
  // sits in the cache pending — indistinguishable from a prefetch that failed.
  // (/materials was the original example here, until its landing page gained a
  // prefetch branch of its own.)
  it("does not blame a route for the queries its own page mounts", async () => {
    const { prefetch } = await render("/courtcases");

    expect(prefetch.fulfilled).toEqual([]);
    expect(prefetch.failed).toEqual([]);
  });

  it("would blame it if the report came after the render", () => {
    // The same route through the same provider stack, with a client this test can
    // read. One pending query, so moving the report below renderToString fails the
    // build on /courtcases and /search — pages behaving as designed. This is the
    // hazard the ordering above avoids, not a hypothetical.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 0 } },
    });
    renderToString(
      <ThemeProvider>
        <HelmetProvider context={{}}>
          <QueryClientProvider client={queryClient}>
            <StaticRouter location="/courtcases">
              <App />
            </StaticRouter>
          </QueryClientProvider>
        </HelmetProvider>
      </ThemeProvider>,
    );

    expect(reportPrefetch(queryClient).failed).toHaveLength(1);
  });
});
