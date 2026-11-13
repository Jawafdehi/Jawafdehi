import { describe, it, expect } from "vitest";

import {
  formatArchiveCount,
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

  it("reads the date part of a full timestamp", () => {
    // A few records carry "2025-12-16T06:16:34.722964"-style values in the
    // date field; the date part is still a usable AD date.
    const resolved = resolveMaterialDate({ date: "2025-12-16T06:16:34.722964" }, NOW);
    expect(resolved.ad).toBe("2025-12-16");
    expect(resolved.bs).toMatch(/^2082-/);
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
