import { describe, it, expect } from "vitest";
import {
  BIGO_BANDS,
  describeBigoRange,
  findBigoBand,
  parseBigoBound,
} from "./bigo-bands";

// Stand-in for i18next's `t`: returns the interpolated English default, which is
// what the pill renders when the Nepali bundle has no override.
const translate = (_key: string, options?: Record<string, unknown>) => {
  const template = String(options?.defaultValue ?? "");
  return template.replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name]));
};

describe("parseBigoBound", () => {
  it("accepts whole non-negative amounts, including zero", () => {
    expect(parseBigoBound("10000000")).toBe(10_000_000);
    // 0 is a real lower bound, not "unset" — the API indexes an honest zero.
    expect(parseBigoBound("0")).toBe(0);
  });

  it("rejects anything the API would answer with a 400", () => {
    // Each of these is refused by the endpoint's IntegerField; forwarding one
    // would surface as the red "could not be loaded" alert, not as a filter.
    expect(parseBigoBound("-1")).toBeUndefined();
    expect(parseBigoBound("1e9")).toBeUndefined();
    expect(parseBigoBound("1.5")).toBeUndefined();
    expect(parseBigoBound(" 10")).toBeUndefined();
    expect(parseBigoBound("abc")).toBeUndefined();
    expect(parseBigoBound("")).toBeUndefined();
    expect(parseBigoBound(null)).toBeUndefined();
  });

  it("rejects a bound past the signed-64-bit ceiling the API clamps to", () => {
    // Compared as BigInt on purpose: 2**63 is past Number.MAX_SAFE_INTEGER, so a
    // Number() round-trip would round it back under the limit and admit it.
    expect(parseBigoBound(String(2n ** 63n - 1n))).toBe(Number(2n ** 63n - 1n));
    expect(parseBigoBound(String(2n ** 63n))).toBeUndefined();
  });
});

describe("findBigoBand", () => {
  it("resolves the preset bands from their exact bounds", () => {
    expect(findBigoBand(undefined, 9_999_999)?.id).toBe("under-1-crore");
    expect(findBigoBand(10_000_000, 99_999_999)?.id).toBe("1-to-10-crore");
    expect(findBigoBand(1_000_000_000, undefined)?.id).toBe("over-1-arab");
  });

  it("returns nothing for no range, or for a range matching no band", () => {
    expect(findBigoBand(undefined, undefined)).toBeUndefined();
    expect(findBigoBand(50_000_000, undefined)).toBeUndefined();
  });

  it("keeps the bands mutually exclusive and gap-free", () => {
    // Adjacent bands must not both claim a rupee. Both bounds are inclusive
    // (the API emits gte/lte), so each band's max is one below the next's min.
    const ordered = [...BIGO_BANDS];
    ordered.slice(0, -1).forEach((band, index) => {
      expect(band.max).toBe((ordered[index + 1].min as number) - 1);
    });
    // Open-ended at both ends, so every amount lands in exactly one band.
    expect(ordered[0].min).toBeUndefined();
    expect(ordered[ordered.length - 1].max).toBeUndefined();
  });
});

describe("describeBigoRange", () => {
  it("labels a preset range with the band's own label", () => {
    expect(describeBigoRange(10_000_000, 99_999_999, translate)).toBe(
      "Rs 1–10 Crore",
    );
  });

  it("describes a hand-edited range rather than showing nothing", () => {
    // A URL can carry any valid pair. The band radios cannot represent it, so
    // the pill is the only thing that makes it visible and removable —
    // an applied filter with no visible control is the Jawafdehi#277 bug.
    expect(describeBigoRange(50_000_000, 60_000_000, translate)).toBe(
      "Rs 5.00 Crore – Rs 6.00 Crore",
    );
    expect(describeBigoRange(50_000_000, undefined, translate)).toBe(
      "Rs 5.00 Crore and above",
    );
    expect(describeBigoRange(undefined, 50_000_000, translate)).toBe(
      "Up to Rs 5.00 Crore",
    );
  });
});
