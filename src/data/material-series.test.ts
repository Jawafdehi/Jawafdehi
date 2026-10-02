import { describe, it, expect } from "vitest";

import {
  MATERIAL_SERIES,
  seriesBySlug,
  seriesBySource,
  seriesCount,
  seriesScope,
} from "./material-series";

describe("MATERIAL_SERIES registry", () => {
  it("keeps slugs unique, and the (source, kind) pair unique", () => {
    const slugs = MATERIAL_SERIES.map((series) => series.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    // The source token alone is NO LONGER an identity — five shelves share
    // `official_report`. What must stay unique is the whole scope, or two
    // shelves would show the same documents under different names.
    const scopes = MATERIAL_SERIES.map((series) =>
      JSON.stringify([series.source, series.kind ?? null, series.kindExclude ?? null]),
    );
    expect(new Set(scopes).size).toBe(scopes.length);
  });

  it("never gives one series both a kind and an exclusion", () => {
    // They are different query shapes and would AND into a near-empty shelf.
    for (const series of MATERIAL_SERIES) {
      expect(series.kind !== undefined && series.kindExclude !== undefined).toBe(false);
    }
  });

  it("gives a shared source token at most one complement shelf", () => {
    // Two complements over one source would overlap on everything neither
    // excludes, so a document would appear on two shelves.
    const complementsBySource = new Map<string, number>();
    for (const series of MATERIAL_SERIES) {
      if (!series.kindExclude) continue;
      complementsBySource.set(
        series.source,
        (complementsBySource.get(series.source) ?? 0) + 1,
      );
    }
    for (const [, count] of complementsBySource) expect(count).toBe(1);
  });

  it("makes the shelves of a shared source a PARTITION of it", () => {
    // The complement must exclude exactly the kinds its siblings claim. Too few
    // and a document shows on two shelves; too many and it shows on none.
    for (const series of MATERIAL_SERIES) {
      if (!series.kindExclude) continue;
      const siblingKinds = MATERIAL_SERIES.filter(
        (other) => other.source === series.source && other.kind,
      ).map((other) => other.kind as string);
      expect([...series.kindExclude].sort()).toEqual([...siblingKinds].sort());
    }
  });

  it("uses URL-safe kebab-case slugs", () => {
    for (const series of MATERIAL_SERIES) {
      expect(series.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("assigns every series a valid folder tint", () => {
    for (const series of MATERIAL_SERIES) {
      expect(series.tint).toBeGreaterThanOrEqual(1);
      expect(series.tint).toBeLessThanOrEqual(8);
      expect(Number.isInteger(series.tint)).toBe(true);
    }
  });

  it("authored every series in BOTH languages", () => {
    for (const series of MATERIAL_SERIES) {
      for (const field of [series.name, series.description, series.typeLabel]) {
        expect(field.ne.trim().length).toBeGreaterThan(0);
        expect(field.en.trim().length).toBeGreaterThan(0);
      }
      // Nepali-first project: the ne strings must actually be Devanagari, not
      // English pasted twice. (Latin acronyms like DFMIS may appear alongside.)
      expect(series.name.ne).toMatch(/[ऀ-ॿ]/);
      expect(series.description.ne).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("covers exactly the flagship publications the landing page curates", () => {
    expect([...new Set(MATERIAL_SERIES.map((series) => series.source))].sort()).toEqual([
      "ag",
      "ciaa_annual_report",
      "ciaa_press_release",
      "kanun_patrika",
      "official_report",
    ]);
  });

  it("looks up by slug and by source", () => {
    const bySlug = seriesBySlug("charge-sheets");
    expect(bySlug?.source).toBe("ag");
    expect(seriesBySlug("not-a-series")).toBeUndefined();
    expect(seriesBySource("not_a_source")).toBeUndefined();
  });
});

describe("seriesScope", () => {
  it("scopes a plain series by source alone", () => {
    expect(seriesScope(seriesBySlug("kanun-patrika")!)).toEqual({
      source: ["kanun_patrika"],
    });
  });

  it("adds the kind for a shelf narrower than its token", () => {
    expect(seriesScope(seriesBySlug("audit-journal")!)).toEqual({
      source: ["official_report"],
      dataset_bucket: ["publication_audit-journals"],
    });
  });

  it("sends the complement as an exclusion, not an enumeration", () => {
    const scope = seriesScope(seriesBySlug("oag-publications")!);
    expect(scope.source).toEqual(["official_report"]);
    expect(scope.dataset_bucket).toBeUndefined();
    // One repeatable param carrying four values, which the API unions into a
    // single must_not. Four separate kinds would be an intersection of
    // exclusions and would drop nothing.
    expect(scope.dataset_bucket_exclude).toHaveLength(4);
    expect(scope.dataset_bucket_exclude).toContain("report_annual-report");
  });
});

describe("seriesCount", () => {
  // Modelled on the live corpus: 228 documents under one source token.
  const materials = {
    total: 346339,
    by_type: [],
    by_source: [
      { source: "official_report", count: 228 },
      { source: "kanun_patrika", count: 220 },
    ],
    by_source_type: [],
    by_dataset_bucket: [
      { source: "official_report", dataset_bucket: "report_province-report", count: 56 },
      {
        source: "official_report",
        dataset_bucket: "publication_audit-bulletin",
        count: 29,
      },
      {
        source: "official_report",
        dataset_bucket: "publication_audit-journals",
        count: 21,
      },
      { source: "official_report", dataset_bucket: "report_annual-report", count: 18 },
      {
        source: "official_report",
        dataset_bucket: "publication_right-to-information",
        count: 22,
      },
    ],
    counts: { with_description: 0, with_url: 0, with_date: 0 },
  } as never;

  it("returns null while statistics are loading, so a card shows a dash", () => {
    expect(seriesCount(seriesBySlug("audit-journal")!, undefined)).toBeNull();
  });

  it("counts a plain series off by_source, unchanged", () => {
    expect(seriesCount(seriesBySlug("kanun-patrika")!, materials)).toBe(220);
  });

  it("counts a kinded shelf off its own bucket row", () => {
    expect(seriesCount(seriesBySlug("auditor-general-reports")!, materials)).toBe(18);
    expect(seriesCount(seriesBySlug("province-audit-reports")!, materials)).toBe(56);
    expect(seriesCount(seriesBySlug("audit-journal")!, materials)).toBe(21);
    expect(seriesCount(seriesBySlug("audit-bulletin")!, materials)).toBe(29);
  });

  it("counts the complement by SUBTRACTION, so unknown kinds are not lost", () => {
    // 228 − (18 + 56 + 21 + 29) = 104. Note the fixture's bucket rows do not
    // enumerate every kind the token holds — that is the point: summing the
    // kinds it keeps would undercount, subtracting the kinds it excludes does
    // not.
    expect(seriesCount(seriesBySlug("oag-publications")!, materials)).toBe(104);
  });

  it("makes the shelves of one token sum to that token's total", () => {
    const total = MATERIAL_SERIES.filter((s) => s.source === "official_report").reduce(
      (sum, series) => sum + (seriesCount(series, materials) ?? 0),
      0,
    );
    expect(total).toBe(228);
  });

  it("yields 0 for a kinded shelf when the API predates by_dataset_bucket", () => {
    // Degrades to an honest zero rather than showing the whole token's 228
    // under "annual reports", which is the bug this all exists to fix.
    const older = { ...(materials as object), by_dataset_bucket: undefined } as never;
    expect(seriesCount(seriesBySlug("auditor-general-reports")!, older)).toBe(0);
  });

  it("never renders a negative count from a stale snapshot", () => {
    const stale = {
      ...(materials as object),
      by_source: [{ source: "official_report", count: 10 }],
    } as never;
    expect(seriesCount(seriesBySlug("oag-publications")!, stale)).toBe(0);
  });
});

describe("seriesBySource resolves a document to the right shelf", () => {
  it("returns the only shelf when a token has just one", () => {
    expect(seriesBySource("kanun_patrika")?.slug).toBe("kanun-patrika");
  });

  it("picks the shelf matching the document's kind", () => {
    expect(seriesBySource("official_report", "report_annual-report")?.slug).toBe(
      "auditor-general-reports",
    );
    expect(seriesBySource("official_report", "publication_audit-journals")?.slug).toBe(
      "audit-journal",
    );
    expect(seriesBySource("official_report", "report_province-report")?.slug).toBe(
      "province-audit-reports",
    );
  });

  it("sends an unclaimed kind to the complement shelf", () => {
    expect(seriesBySource("official_report", "publication_financial-statement")?.slug).toBe(
      "oag-publications",
    );
    // A kind this registry has never heard of — the case the exclusion exists
    // for. It must land somewhere, not nowhere.
    expect(seriesBySource("official_report", "publication_brand-new-2027")?.slug).toBe(
      "oag-publications",
    );
  });

  it("sends a document with NO kind to the complement, never to a kinded shelf", () => {
    // One live row carries no bucket. Labelling it "annual reports" — which is
    // what matching the first entry would do — is the exact failure being fixed.
    expect(seriesBySource("official_report")?.slug).toBe("oag-publications");
    expect(seriesBySource("official_report", null)?.slug).toBe("oag-publications");
  });
});
