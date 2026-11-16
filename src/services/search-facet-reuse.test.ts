import { describe, expect, it, vi } from "vitest";

import { facetKeyOf, withHeldFacets } from "./search-facet-reuse";
import type {
  ArchiveSearchParams,
  ArchiveSearchResponse,
} from "@/types/search";

function response(
  overrides: Partial<ArchiveSearchResponse> = {},
): ArchiveSearchResponse {
  return {
    count: 40,
    counts: { case: 40 },
    facets: { tags: [{ name: "land", count: 3 }] },
    extents: { bigo: { min: 1, max: 9, count: 2 } },
    results: [],
    did_you_mean: null,
    ...overrides,
  } as unknown as ArchiveSearchResponse;
}

const lean = () =>
  response({
    counts: {},
    facets: {} as ArchiveSearchResponse["facets"],
    extents: {},
    did_you_mean: "corruption",
  });

describe("facetKeyOf", () => {
  it("ignores the page and the flag, not the filters", () => {
    const base: ArchiveSearchParams = { q: "x", tags: ["land"] };
    expect(facetKeyOf({ ...base, page: 1 })).toBe(facetKeyOf({ ...base, page: 4 }));
    expect(facetKeyOf({ ...base, include_facets: false })).toBe(facetKeyOf(base));
    expect(facetKeyOf(base)).not.toBe(facetKeyOf({ ...base, tags: ["tax"] }));
  });

  it("does not depend on key order", () => {
    expect(facetKeyOf({ q: "x", type: "case" })).toBe(
      facetKeyOf({ type: "case", q: "x" }),
    );
  });
});

describe("withHeldFacets", () => {
  it("page 1 is a full request", async () => {
    const fetcher = vi.fn().mockResolvedValue(response());
    await withHeldFacets(fetcher)({ q: "x", page: 1 });
    expect(fetcher.mock.calls[0][0].include_facets).toBeUndefined();
  });

  it("page 2 of the same search skips facets and reuses the held ones", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(lean());
    const search = withHeldFacets(fetcher);
    await search({ q: "x", page: 1 });
    const page2 = await search({ q: "x", page: 2 });
    expect(fetcher.mock.calls[1][0]).toMatchObject({ page: 2, include_facets: false });
    expect(page2.facets).toEqual(response().facets);
    expect(page2.counts).toEqual({ case: 40 });
    expect(page2.extents).toEqual(response().extents);
    // Fields that DO depend on the page come from the lean response.
    expect(page2.did_you_mean).toBe("corruption");
  });

  it("landing directly on a later page is a full request", async () => {
    const fetcher = vi.fn().mockResolvedValue(response());
    await withHeldFacets(fetcher)({ q: "x", page: 3 });
    expect(fetcher.mock.calls[0][0].include_facets).toBeUndefined();
  });

  it("a changed filter is a full request even on a later page", async () => {
    const fetcher = vi.fn().mockResolvedValue(response());
    const search = withHeldFacets(fetcher);
    await search({ q: "x", page: 1 });
    await search({ q: "x", page: 2, tags: ["land"] });
    expect(fetcher.mock.calls[1][0].include_facets).toBeUndefined();
  });

  it("a failed full request holds nothing", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValue(response());
    const search = withHeldFacets(fetcher);
    await expect(search({ q: "x", page: 1 })).rejects.toThrow("503");
    await search({ q: "x", page: 2 });
    expect(fetcher.mock.calls[1][0].include_facets).toBeUndefined();
  });

  it("cursor paging is left alone", async () => {
    const fetcher = vi.fn().mockResolvedValue(response());
    const search = withHeldFacets(fetcher);
    await search({ q: "x", page: 1 });
    await search({ q: "x", page: 2, cursor: "abc" });
    expect(fetcher.mock.calls[1][0].include_facets).toBeUndefined();
  });
});
