import { describe, it, expect } from "vitest";

import {
  formatArchiveCount,
  pickRecentMaterials,
  resolveMaterialDate,
  sourceFromMaterialUrl,
} from "./materials-landing";

import type { ArchiveSearchResult } from "@/types/search";

// All date assertions pin currentAdYear to 2026 so they do not rot as the
// real clock advances past the fixtures.
const NOW = 2026;

describe("resolveMaterialDate", () => {
  it("trusts a complete AD + BS pair as-is", () => {
    // The oldest NKP precedent, straight off the live search API.
    expect(
      resolveMaterialDate({ date: "1952-03-27", date_bs: "2008-12-15" }, NOW),
    ).toEqual({ ad: "1952-03-27", bs: "2008-12-15" });
  });

  it("reads an impossible future AD year as a mis-fielded BS date", () => {
    // Several sources store BS in the AD field and omit date_bs; a document
    // cannot be dated AD 2082. BS 2082-11-27 is 2026-03-11 AD.
    expect(resolveMaterialDate({ date: "2082-11-27" }, NOW)).toEqual({
      ad: "2026-03-11",
      bs: "2082-11-27",
    });
  });

  it("derives the BS pair for a plausible bare AD date", () => {
    const resolved = resolveMaterialDate({ date: "2026-08-24" }, NOW);
    expect(resolved.ad).toBe("2026-08-24");
    expect(resolved.bs).toMatch(/^2083-/);
  });

  it("returns nulls for missing or malformed dates", () => {
    expect(resolveMaterialDate(undefined, NOW)).toEqual({ ad: null, bs: null });
    expect(resolveMaterialDate({}, NOW)).toEqual({ ad: null, bs: null });
    expect(resolveMaterialDate({ date: "vs 2082" }, NOW)).toEqual({ ad: null, bs: null });
  });
});

function hit(url: string, date?: string, date_bs?: string): ArchiveSearchResult {
  return {
    type: "material",
    id: `https://jawafdehi.org${url}`,
    source_app: "ngm",
    title: { ne: url, en: null },
    snippet: { ne: null, en: null },
    score: 1,
    url,
    api_url: null,
    matched_fields: [],
    extra: { date, date_bs },
  };
}

describe("pickRecentMaterials", () => {
  it("re-orders by RESOLVED date, so BS-in-AD rows stop outranking newer documents", () => {
    // sort=newest puts the BS-fielded 2082-11-27 (= 2026-03-11 AD) first; the
    // genuinely newer 2026-08-24 AD document must win after resolution.
    const results = [
      hit("/material/court_order/a", "2082-11-27"),
      hit("/material/ciaa_press_release/b", "2026-08-24"),
      hit("/material/nkp/c", "2021-04-07", "2078-01-25"),
    ];
    const picked = pickRecentMaterials(results, 3, NOW);
    expect(picked.map((entry) => entry.result.url)).toEqual([
      "/material/ciaa_press_release/b",
      "/material/court_order/a",
      "/material/nkp/c",
    ]);
  });

  it("drops undated documents and honours the count", () => {
    const results = [
      hit("/material/news/a"),
      hit("/material/news/b", "2026-01-01"),
      hit("/material/news/c", "2025-01-01"),
    ];
    const picked = pickRecentMaterials(results, 1, NOW);
    expect(picked).toHaveLength(1);
    expect(picked[0].result.url).toBe("/material/news/b");
  });
});

describe("sourceFromMaterialUrl", () => {
  it("extracts the source token from a material path or full IRI", () => {
    expect(sourceFromMaterialUrl("/material/nkp/9851")).toBe("nkp");
    expect(
      sourceFromMaterialUrl("https://jawafdehi.org/material/ciaa_annual_report/x_70b5c7ec"),
    ).toBe("ciaa_annual_report");
  });

  it("keeps multi-segment sources whole", () => {
    expect(sourceFromMaterialUrl("/material/province/koshi/doc-1")).toBe("province/koshi");
  });

  it("returns null for non-material URLs", () => {
    expect(sourceFromMaterialUrl("/case/some-case")).toBeNull();
    expect(sourceFromMaterialUrl("/material/only-one-segment")).toBeNull();
  });
});

describe("formatArchiveCount", () => {
  it("groups in the Indian system for both languages", () => {
    expect(formatArchiveCount(345886, "en")).toBe("3,45,886");
  });

  it("uses Devanagari digits in Nepali", () => {
    expect(formatArchiveCount(345886, "ne")).toBe("३,४५,८८६");
    expect(formatArchiveCount(41, "ne-NP")).toBe("४१");
  });
});
