import { describe, expect, it, vi } from "vitest";

import type { ArchiveSearchResponse } from "@/types/search";

const { searchArchiveMock, getStatisticsMock } = vi.hoisted(() => ({
  searchArchiveMock: vi.fn(),
  getStatisticsMock: vi.fn(),
}));

vi.mock("@/services/search-api", () => ({ searchArchive: searchArchiveMock }));
vi.mock("@/services/jds-api", () => ({
  getStatistics: getStatisticsMock,
  getCaseById: vi.fn(),
}));

const response: ArchiveSearchResponse = {
  query: "",
  lang: "both",
  sort: "featured",
  page: 1,
  page_size: 6,
  count: 1,
  counts: { case: 1 },
  facets: { entity_type: [], case_type: [], tags: [], status: [] },
  next_cursor: null,
  results: [
    {
      type: "case",
      id: "https://jawafdehi.org/case/curated",
      source_app: "jawafdehi",
      title: { ne: null, en: "Curated case" },
      snippet: { ne: null, en: "" },
      url: "/case/curated",
      api_url: "/api/cases/curated/",
      matched_fields: [],
      score: 1,
      extra: { weight: 90 },
    },
  ],
};

searchArchiveMock.mockResolvedValue(response);
getStatisticsMock.mockResolvedValue({});

const { render } = await import("../../src/entry-server");
const { featuredCasesQuery } = await import("@/queries/home");

/**
 * The sibling property test (render.property.test.ts) walks /about, /cases,
 * /entities, /information, /updates and /feedback — every route EXCEPT '/', so the
 * homepage prefetch branch has never been executed by the suite. That branch is
 * the one whose failure mode is silent: if it fills a cache entry the client does
 * not read, SSR still returns valid HTML and the section just flashes its
 * skeleton, so nothing fails and nobody notices.
 */
describe("SSR prefetch for the homepage", () => {
  it("dehydrates the featured cases under the key the client reads", async () => {
    const { dehydratedState } = await render("/");

    const keys = (dehydratedState as { queries: { queryKey: unknown }[] }).queries.map(
      (q) => q.queryKey,
    );
    expect(keys).toEqual(
      expect.arrayContaining([[...featuredCasesQuery().queryKey]]),
    );
  });

  it("prefetches the featured order, not the newest one", async () => {
    await render("/");

    expect(searchArchiveMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "case", sort: "featured" }),
    );
  });
});
