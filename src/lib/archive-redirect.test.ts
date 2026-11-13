import { describe, expect, it } from "vitest";

import { archiveSearchUrl, retiredBrowseType } from "./archive-redirect";

describe("archiveSearchUrl", () => {
  it("types the search and keeps every param, repeated ones included", () => {
    expect(archiveSearchUrl("courtcase", "?q=x&court=supreme&court=special")).toBe(
      "/search/?type=courtcase&q=x&court=supreme&court=special",
    );
  });

  it("renames the old search= to q=", () => {
    expect(archiveSearchUrl("case", "?search=prachanda")).toBe("/search/?type=case&q=prachanda");
  });

  it("keeps the series, which /search filters by, and drops a stale type", () => {
    expect(archiveSearchUrl("material", new URLSearchParams("type=case&series=x&q=y"))).toBe(
      "/search/?type=material&series=x&q=y",
    );
  });

  it("maps the old series page's from/to onto the search date range", () => {
    expect(archiveSearchUrl("material", "?series=x&from=2080-01-01&to=2081-01-01&when=1y")).toBe(
      "/search/?type=material&series=x&date_from=2080-01-01&date_to=2081-01-01",
    );
  });
});

describe("retiredBrowseType", () => {
  it.each([
    ["/cases", "case"],
    ["/cases/page/3", "case"],
    ["/courtcases", "courtcase"],
    ["/case/some-slug", null],
    ["/cases/page/3/extra", null],
    ["/courtcase/special/081-CR-0107", null],
  ])("%s → %s", (path, type) => {
    expect(retiredBrowseType(path)).toBe(type);
  });
});
