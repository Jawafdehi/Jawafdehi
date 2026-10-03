import { describe, it, expect } from "vitest";

import {
  bigoArcFraction,
  formatBigoCompact,
  formatCount,
  hashSlug,
} from "@/lib/case-thumbnail";

describe("hashSlug", () => {
  it("is deterministic: same slug, same hash", () => {
    expect(hashSlug("anup-mehra-nawalparasi-land-080-cr-0064")).toBe(
      hashSlug("anup-mehra-nawalparasi-land-080-cr-0064"),
    );
  });

  it("differs for different slugs", () => {
    expect(hashSlug("bara-hulak-081-CR-0091")).not.toBe(hashSlug("bharat-tal-case-080-cr-0190"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const hash = hashSlug("मुद्दा-slug-with-devanagari");
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(hash)).toBe(true);
  });
});

describe("bigoArcFraction", () => {
  it("returns 0 for missing or non-positive amounts", () => {
    expect(bigoArcFraction(null)).toBe(0);
    expect(bigoArcFraction(undefined)).toBe(0);
    expect(bigoArcFraction(0)).toBe(0);
    expect(bigoArcFraction(-5)).toBe(0);
  });

  it("is monotonic across the dataset's real range", () => {
    // Real बिगो values from the live dataset, ascending.
    const amounts = [45_220, 320_000, 2_682_014, 50_542_000, 302_934_897, 9_000_000_000, 66_000_000_000];
    const fractions = amounts.map(bigoArcFraction);
    for (let i = 1; i < fractions.length; i++) {
      expect(fractions[i]).toBeGreaterThan(fractions[i - 1]);
    }
  });

  it("visibly separates same-unit amounts (the raw-log compression bug)", () => {
    // Rs 5.05 crore vs Rs 30.29 crore looked nearly identical under a raw log
    // scale over the full range; the banded scale must keep them apart.
    const gap = bigoArcFraction(302_934_897) - bigoArcFraction(50_542_000);
    expect(gap).toBeGreaterThan(0.08);
  });

  it("clamps at the top of the scale", () => {
    expect(bigoArcFraction(1e13)).toBe(0.95);
    expect(bigoArcFraction(66_000_000_000)).toBeLessThanOrEqual(0.95);
  });

  it("never exceeds the band envelope", () => {
    for (const amount of [1, 99_999, 100_000, 9_999_999, 1e7, 999_999_999, 1e9, 1e11]) {
      const f = bigoArcFraction(amount);
      expect(f).toBeGreaterThanOrEqual(0.1);
      expect(f).toBeLessThanOrEqual(0.95);
    }
  });
});

describe("formatBigoCompact", () => {
  it("formats crore-scale amounts in English", () => {
    expect(formatBigoCompact(50_542_000, "en")).toEqual({ prefix: "Rs", value: "5.05", unit: "Crore" });
  });

  it("formats crore-scale amounts with Nepali numerals in Nepali", () => {
    expect(formatBigoCompact(50_542_000, "ne")).toEqual({ prefix: "रु", value: "५.०५", unit: "करोड" });
  });

  it("covers all unit boundaries", () => {
    expect(formatBigoCompact(320_000, "en").unit).toBe("Lakh");
    expect(formatBigoCompact(9_000_000_000, "en").unit).toBe("Arab");
    expect(formatBigoCompact(191_000_000_000, "en").unit).toBe("Kharab");
  });

  it("renders sub-lakh amounts with Indian digit grouping and no unit", () => {
    const result = formatBigoCompact(45_220, "en");
    expect(result.value).toBe("45,220");
    expect(result.unit).toBe("");
  });

  it("keeps separators intact when localizing digits", () => {
    // The Nepali path maps digit characters only — '.' and ',' must survive.
    expect(formatBigoCompact(45_220, "ne").value).toBe("४५,२२०");
  });

  it("handles the ne-NP locale variant", () => {
    expect(formatBigoCompact(50_542_000, "ne-NP").prefix).toBe("रु");
  });
});

describe("formatCount", () => {
  it("localizes counts per language", () => {
    expect(formatCount(26, "en")).toBe("26");
    expect(formatCount(26, "ne")).toBe("२६");
  });
});
