// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";

import { crawlableListing, listingPath, LISTING_MAX_PAGE } from "./crawlable-listing";

describe("crawlableListing", () => {
  it.each([
    ["?type=case", { type: "case", page: 1 }],
    ["?type=entity&page=2", { type: "entity", page: 2 }],
    ["?page=7&type=courtcase", { type: "courtcase", page: 7 }],
  ])("is the unfiltered listing of one record type: %s", (search, expected) => {
    expect(crawlableListing("/search/", search)).toEqual(expected);
    expect(crawlableListing("/search", search)).toEqual(expected);
  });

  it("ignores tracking parameters, which do not change the page", () => {
    expect(crawlableListing("/search/", "?type=case&utm_source=facebook&fbclid=x")).toEqual({
      type: "case",
      page: 1,
    });
  });

  it.each([
    "?type=case&q=bribe",
    "?type=case&tags=land",
    "?type=case&sort=oldest",
    "?type=entity&entity_type=Person",
    "?type=courtcase&court=special",
    "?type=case&case_origin=ciaa",
  ])("is NOT a listing once anything narrows it: %s", (search) => {
    // An unbounded space of URLs; PaginationControls' rule is not to hand a
    // crawler one.
    expect(crawlableListing("/search/", search)).toBeNull();
  });

  it.each([
    ["documents, whose pages are all noindex", "?type=material"],
    ["the all tab, which duplicates the typed ones", "?type=all"],
    ["no type at all", ""],
    ["an unknown type", "?type=bogus"],
    ["a repeated type", "?type=case&type=entity"],
  ])("is NOT a listing for %s", (_, search) => {
    expect(crawlableListing("/search/", search)).toBeNull();
  });

  it.each(["0", "-1", "two", "1.5", "007", "", "123456"])("rejects page=%s", (page) => {
    expect(crawlableListing("/search/", `?type=case&page=${page}`)).toBeNull();
  });

  it("stops at the API's offset window, past which a page is a 400", () => {
    expect(LISTING_MAX_PAGE).toBe(833); // 10,000 / 12
    expect(crawlableListing("/search/", `?type=case&page=${LISTING_MAX_PAGE}`)).not.toBeNull();
    expect(crawlableListing("/search/", `?type=case&page=${LISTING_MAX_PAGE + 1}`)).toBeNull();
  });

  it("is only ever /search", () => {
    expect(crawlableListing("/cases/", "?type=case")).toBeNull();
    expect(crawlableListing("/search/extra", "?type=case")).toBeNull();
  });
});

describe("listingPath", () => {
  it("is one URL per (type, page), so one render and one cache entry", () => {
    expect(listingPath({ type: "case", page: 1 })).toBe("/search/?type=case");
    expect(listingPath({ type: "entity", page: 4 })).toBe("/search/?type=entity&page=4");
  });

  it("round-trips through crawlableListing", () => {
    for (const listing of [
      { type: "case", page: 1 },
      { type: "courtcase", page: 833 },
    ] as const) {
      const url = new URL(listingPath(listing), "https://jawafdehi.org");
      expect(crawlableListing(url.pathname, url.search)).toEqual(listing);
    }
  });
});
