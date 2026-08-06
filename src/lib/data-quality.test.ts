import { describe, it, expect } from "vitest";
import {
  adSpanForBsYear,
  bsYearRows,
  bsYearWithAd,
  truncPct,
} from "./data-quality";

describe("bsYearRows", () => {
  it("keeps rows carrying a BS year", () => {
    const rows = [
      { bs_year: 2081, count: 3 },
      { bs_year: 2082, count: 4 },
    ];
    expect(bsYearRows(rows)).toEqual(rows);
  });

  it("drops a pre-cutover payload keyed by an AD year", () => {
    // The old API shape. Kept, these collapse to one `undefined` year: the
    // heatmap would merge every column into one while its totals stayed right.
    const legacy = [{ year: 2024, count: 3 }] as unknown as {
      bs_year: number;
      count: number;
    }[];
    expect(bsYearRows(legacy)).toEqual([]);
  });

  it("treats a missing field as no rows", () => {
    expect(bsYearRows(undefined)).toEqual([]);
  });
});

describe("adSpanForBsYear", () => {
  it("spans the two Gregorian years a BS year actually covers", () => {
    // BS 2081 opened 2024-04-13 and closed 2025-04-13, so neither AD year alone
    // describes it — the pair is the honest label.
    expect(adSpanForBsYear(2081)).toBe("2024/25");
    expect(adSpanForBsYear(2082)).toBe("2025/26");
  });

  it("holds across the whole range the dashboard paints", () => {
    // Oldest and newest columns on prod: BS 2059 (from 2002-04-24) and BS 2083.
    expect(adSpanForBsYear(2059)).toBe("2002/03");
    expect(adSpanForBsYear(2083)).toBe("2026/27");
  });

  it("zero-pads a century rollover instead of showing a bare digit", () => {
    // BS 2057 closes in AD 2001 — "2000/1" would read as a typo.
    expect(adSpanForBsYear(2057)).toBe("2000/01");
  });
});

describe("bsYearWithAd", () => {
  // The real `t` is i18next; a stub that interpolates the default string is
  // enough to pin the shape callers render into tooltips and ARIA labels.
  const t = ((_key: string, fallback: string, vars: Record<string, unknown>) =>
    fallback
      .replace("{{bs}}", String(vars.bs))
      .replace("{{ad}}", String(vars.ad))) as unknown as Parameters<
    typeof bsYearWithAd
  >[1];

  it("names the calendar and carries the Gregorian anchor", () => {
    expect(bsYearWithAd(2081, t)).toBe("BS 2081 (AD 2024/25)");
  });
});

describe("truncPct", () => {
  it("truncates so an incomplete figure never reads as 100%", () => {
    expect(truncPct(1_610_701, 1_610_771)).toBe(99.99);
  });

  it("is 0 for an empty denominator rather than NaN", () => {
    expect(truncPct(5, 0)).toBe(0);
  });
});
