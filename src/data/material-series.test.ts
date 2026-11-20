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
      "legal_template",
      "official_report",
    ]);
  });

  it("never fills a whole grid row with one publisher", () => {
    // Registry order IS render order. Five of the ten shelves are the Auditor
    // General's, and listed as a block they filled two of the grid's three
    // rows — a page about the archive's BREADTH reading as one institution.
    // The fix is to interleave them, NOT to drop shelves from the grid: every
    // one still has a folder, so nothing became harder to find.
    //
    // Checked at both widths the grid actually uses (lg:grid-cols-4 and
    // sm:grid-cols-2). A trailing part-row is skipped — it is not a full row,
    // and with an odd count there is always one.
    for (const columns of [4, 2]) {
      for (let start = 0; start + columns <= MATERIAL_SERIES.length; start += columns) {
        const row = MATERIAL_SERIES.slice(start, start + columns);
        const perSource = new Map<string, number>();
        for (const series of row) {
          perSource.set(series.source, (perSource.get(series.source) ?? 0) + 1);
        }
        // No MAJORITY, not merely "more than one distinct": three of four cards
        // from one publisher still reads as that publisher's row.
        const dominant = Math.max(...perSource.values());
        expect(dominant, `${columns}-col row at ${start}`).toBeLessThanOrEqual(columns / 2);
      }
    }
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
  // Modelled on the live catalogue (/api/document-sources/): 228 documents
  // under one source token, split into kind buckets.
  const catalogue = {
    ready: true,
    sources: [
      {
        source: "official_report",
        name: { en: "Auditor General reports and publications" },
        publisher: { en: "Office of the Auditor General" },
        labelled: true,
        count: 228,
        series: [
          { bucket: "report_province-report", count: 56 },
          { bucket: "publication_audit-bulletin", count: 29 },
          { bucket: "publication_audit-journals", count: 21 },
          { bucket: "report_annual-report", count: 18 },
          { bucket: "publication_right-to-information", count: 22 },
        ],
      },
      {
        source: "kanun_patrika",
        name: { en: "Kanun Patrika" },
        publisher: null,
        labelled: true,
        count: 220,
        series: [],
      },
    ],
  };

  it("returns null while the catalogue is loading, so a card shows a dash", () => {
    expect(seriesCount(seriesBySlug("audit-journal")!, undefined)).toBeNull();
  });

  it("shows a dash, not a premature zero, while the counts are not ready", () => {
    expect(seriesCount(seriesBySlug("kanun-patrika")!, { ...catalogue, ready: false })).toBeNull();
  });

  it("counts a plain series off its source's whole count", () => {
    expect(seriesCount(seriesBySlug("kanun-patrika")!, catalogue)).toBe(220);
  });

  it("counts a kinded shelf off its own bucket", () => {
    expect(seriesCount(seriesBySlug("auditor-general-reports")!, catalogue)).toBe(18);
    expect(seriesCount(seriesBySlug("province-audit-reports")!, catalogue)).toBe(56);
    expect(seriesCount(seriesBySlug("audit-journal")!, catalogue)).toBe(21);
    expect(seriesCount(seriesBySlug("audit-bulletin")!, catalogue)).toBe(29);
  });

  it("counts the complement by SUBTRACTION, so unknown kinds are not lost", () => {
    // 228 − (18 + 56 + 21 + 29) = 104. The fixture's buckets do not enumerate
    // every kind the token holds — that is the point: summing the kinds it
    // keeps would undercount, subtracting the kinds it excludes does not.
    expect(seriesCount(seriesBySlug("oag-publications")!, catalogue)).toBe(104);
  });

  it("makes the shelves of one token sum to that token's total", () => {
    const total = MATERIAL_SERIES.filter((s) => s.source === "official_report").reduce(
      (sum, series) => sum + (seriesCount(series, catalogue) ?? 0),
      0,
    );
    expect(total).toBe(228);
  });

  it("yields 0 for a kinded shelf when the source lists no buckets", () => {
    // An honest zero rather than the whole token's 228 under "annual reports",
    // which is the bug the kind split exists to fix.
    const older = {
      ...catalogue,
      sources: catalogue.sources.map((row) => ({ ...row, series: undefined })),
    };
    expect(seriesCount(seriesBySlug("auditor-general-reports")!, older)).toBe(0);
  });

  it("counts 0 for a source the catalogue does not list", () => {
    expect(seriesCount(seriesBySlug("legal-templates")!, catalogue)).toBe(0);
  });

  it("never renders a negative count from a stale catalogue", () => {
    const stale = {
      ...catalogue,
      sources: [{ ...catalogue.sources[0], count: 10 }],
    };
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
