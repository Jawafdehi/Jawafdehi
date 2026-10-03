import { describe, expect, it } from "vitest";

import {
  CASES_PAGE_SIZE,
  casesPageCount,
  casesPagePath,
  casesPagePaths,
  parseCasesPageParam,
} from "./cases-pagination";

describe("casesPagePath", () => {
  it("gives page one the bare /cases/ URL", () => {
    expect(casesPagePath(1)).toBe("/cases/");
  });

  it("numbers every other page in the path, not a query string", () => {
    // A query string cannot be pre-rendered: dist/<path>/index.html is served
    // by ASSETS.fetch, which ignores the query, so /cases/?page=2 would return
    // page one's HTML under a second URL.
    expect(casesPagePath(2)).toBe("/cases/page/2/");
    expect(casesPagePath(39)).toBe("/cases/page/39/");
  });

  it("never emits /cases/page/1/, which would duplicate /cases/", () => {
    for (const page of [1, 0, -4]) {
      expect(casesPagePath(page)).toBe("/cases/");
    }
  });
});

describe("parseCasesPageParam", () => {
  it("reads a missing param as page one", () => {
    expect(parseCasesPageParam(undefined)).toBe(1);
  });

  it("reads a page number", () => {
    expect(parseCasesPageParam("2")).toBe(2);
    expect(parseCasesPageParam("39")).toBe(39);
  });

  it("rejects an explicit page 1, which has its own URL", () => {
    expect(parseCasesPageParam("1")).toBeNull();
  });

  it.each(["0", "-1", "abc", "2.5", "01", "", " 2", "2 ", "1e3", "٢"])(
    "rejects %o rather than coercing it to a page",
    (raw) => {
      // Coercion here is what turns one listing into an unbounded family of
      // URLs that all serve the same cards — the duplicate-body problem the
      // numbered pages exist to fix.
      expect(parseCasesPageParam(raw)).toBeNull();
    },
  );
});

describe("casesPageCount", () => {
  it("counts whole and partial pages", () => {
    expect(casesPageCount(463)).toBe(39); // 38 full pages of 12, then 7
    expect(casesPageCount(48)).toBe(4);
    expect(casesPageCount(49)).toBe(5);
  });

  it("keeps one page when there is nothing to show, so /cases/ still exists", () => {
    expect(casesPageCount(0)).toBe(1);
    expect(casesPageCount(-1)).toBe(1);
    expect(casesPageCount(Number.NaN)).toBe(1);
  });

  it("uses the page size the API is actually asked for", () => {
    expect(CASES_PAGE_SIZE).toBe(12);
    expect(casesPageCount(100, 25)).toBe(4);
  });
});

describe("casesPagePaths", () => {
  it("lists page one first and every later page after it", () => {
    expect(casesPagePaths(30)).toEqual([
      "/cases/",
      "/cases/page/2/",
      "/cases/page/3/",
    ]);
  });

  it("round-trips through parseCasesPageParam for the whole archive", () => {
    // What the pre-render writes, the route has to be able to read back.
    const paths = casesPagePaths(463);
    expect(paths).toHaveLength(39);
    for (const [index, path] of paths.entries()) {
      const param = path.match(/^\/cases\/page\/(\d+)\/$/)?.[1];
      const parsed = parseCasesPageParam(param);
      expect(parsed ?? 1).toBe(index + 1);
    }
  });
});
