import { describe, expect, it, vi, beforeEach } from "vitest";

const { searchArchiveMock } = vi.hoisted(() => ({ searchArchiveMock: vi.fn() }));

vi.mock("@/services/search-api", () => ({ searchArchive: searchArchiveMock }));

const { FEATURED_CASE_COUNT, featuredCasesQuery } = await import("@/queries/home");

describe("featuredCasesQuery", () => {
  beforeEach(() => {
    searchArchiveMock.mockReset();
    searchArchiveMock.mockResolvedValue({ results: [] });
  });

  it("asks the search API for the featured order", async () => {
    // `sort` is a server-side ChoiceField, so this string is a contract with the
    // API's ALL_SORTS, not a local preference: "newest" silently reverts the
    // curation, and a typo is a 400 that leaves the section on its skeleton.
    await featuredCasesQuery().queryFn();

    expect(searchArchiveMock).toHaveBeenCalledWith({
      type: "case",
      sort: "featured",
      page_size: FEATURED_CASE_COUNT,
    });
  });

  it("keeps the cache key stable across calls", () => {
    // The SSR prefetch and the client render both key off this. A key that varies
    // per call (a fresh object identity is fine, differing contents are not) means
    // SSR fills an entry the client never reads and the grid flashes its skeleton.
    expect(featuredCasesQuery().queryKey).toEqual(featuredCasesQuery().queryKey);
    expect(featuredCasesQuery().queryKey).toEqual([
      "home-featured-cases",
      { page_size: FEATURED_CASE_COUNT },
    ]);
  });
});
