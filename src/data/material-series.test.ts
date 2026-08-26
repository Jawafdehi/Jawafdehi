import { describe, it, expect } from "vitest";

import { MATERIAL_SERIES, seriesBySlug, seriesBySource } from "./material-series";

describe("MATERIAL_SERIES registry", () => {
  it("keeps slugs and source tokens unique — both are identities", () => {
    const slugs = MATERIAL_SERIES.map((series) => series.slug);
    const sources = MATERIAL_SERIES.map((series) => series.source);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(sources).size).toBe(sources.length);
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

  it("covers the flagship series the archive is known for", () => {
    expect(seriesBySource("ciaa_annual_report")).toBeDefined();
    expect(seriesBySource("ag")).toBeDefined();
    expect(seriesBySource("nkp")).toBeDefined();
    expect(seriesBySource("kanun_patrika")).toBeDefined();
  });

  it("looks up by slug and by source", () => {
    const bySlug = seriesBySlug("charge-sheets");
    expect(bySlug?.source).toBe("ag");
    expect(seriesBySlug("not-a-series")).toBeUndefined();
    expect(seriesBySource("not_a_source")).toBeUndefined();
  });
});
