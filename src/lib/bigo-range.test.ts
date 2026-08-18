import { describe, it, expect } from "vitest";
import {
  boundToIndex,
  describeBigoRange,
  hasUsableRails,
  indexToBound,
  parseBigoBound,
  readBigoBounds,
  type BigoExtent,
} from "./bigo-range";

// Stand-in for i18next's `t`: returns the interpolated English default, which is
// what renders when the Nepali bundle has no override.
const translate = (_key: string, options?: Record<string, unknown>) => {
  const template = String(options?.defaultValue ?? "");
  return template.replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name]));
};

// The real published corpus, per JawafdehiAPI#450: रु ४५,२२० to रु ६६ अरब. Stops
// and buckets are server-supplied — this mirrors what the API emits.
const STOPS = Array.from({ length: 13 }, (_, exponent) =>
  [1, 2, 5].map((mantissa) => mantissa * 10 ** exponent),
).flat();
const CORPUS: BigoExtent = {
  min: 45_220,
  max: 66_000_000_000,
  count: 68,
  stops: STOPS,
  buckets: Array.from({ length: 14 }, (_, i) => ({
    from: i === 0 ? null : 10 ** (i - 1),
    to: i === 13 ? null : 10 ** i,
    count: i,
  })),
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
    expect(parseBigoBound(null)).toBeUndefined();
  });

  it("rejects a bound past the signed-64-bit ceiling the API clamps to", () => {
    // Compared as BigInt on purpose: 2**63 is past Number.MAX_SAFE_INTEGER, so a
    // Number() round-trip would round it back under the limit and admit it.
    expect(parseBigoBound(String(2n ** 63n - 1n))).toBe(Number(2n ** 63n - 1n));
    expect(parseBigoBound(String(2n ** 63n))).toBeUndefined();
  });
});

describe("readBigoBounds", () => {
  const read = (query: string) => readBigoBounds(new URLSearchParams(query));

  it("returns both bounds when the pair is usable", () => {
    expect(read("bigo_min=10000000&bigo_max=99999999")).toEqual({
      min: 10_000_000,
      max: 99_999_999,
    });
    expect(read("bigo_min=0")).toEqual({ min: 0, max: undefined });
  });

  it("drops BOTH bounds when the pair is inverted", () => {
    // Regression: each bound parses fine on its own, so a caller doing its own
    // per-bound parsing would send bigo_min > bigo_max and take a 400. URL
    // normalization repairs that only on an effect — a tick AFTER the first
    // render has already fired its request — so the rule has to live here,
    // where the request builder reads it too.
    expect(read("bigo_min=100000000&bigo_max=10000000")).toEqual({});
  });

  it("keeps an equal pair — that is an exact-amount lookup", () => {
    expect(read("bigo_min=500&bigo_max=500")).toEqual({ min: 500, max: 500 });
  });

  it("drops only the malformed half", () => {
    expect(read("bigo_min=abc&bigo_max=99999999")).toEqual({
      min: undefined,
      max: 99_999_999,
    });
  });
});

describe("hasUsableRails", () => {
  it("accepts an extent that can actually drive a control", () => {
    expect(hasUsableRails(CORPUS)).toBe(true);
  });

  it("rejects what would render as a slider pinned shut", () => {
    // No extent at all (an older cached response), nothing recorded, or a
    // ladder too short to drag along. Rendering nothing beats a dead control.
    expect(hasUsableRails(undefined)).toBe(false);
    expect(hasUsableRails({ ...CORPUS, count: 0 })).toBe(false);
    expect(hasUsableRails({ ...CORPUS, stops: [10_000_000] })).toBe(false);
  });
});

describe("boundToIndex / indexToBound", () => {
  const ladder = CORPUS.stops;
  const last = ladder.length - 1;

  it("round-trips a stop that is on the ladder", () => {
    const index = boundToIndex(ladder, 10_000_000, 0);
    expect(ladder[index]).toBe(10_000_000);
    expect(indexToBound(ladder, index, "min")).toBe(10_000_000);
  });

  it("parks a thumb at the given edge when there is no bound", () => {
    expect(boundToIndex(ladder, undefined, 0)).toBe(0);
    expect(boundToIndex(ladder, undefined, last)).toBe(last);
  });

  it("reads an edge thumb back as NO bound", () => {
    // Full track == unfiltered. Emitting the floor/ceiling as real bounds would
    // send a filter that merely happens to match everything.
    expect(indexToBound(ladder, 0, "min")).toBeUndefined();
    expect(indexToBound(ladder, last, "max")).toBeUndefined();
    // ...but the same positions are real bounds from the other side.
    expect(indexToBound(ladder, last, "min")).toBe(ladder[last]);
    expect(indexToBound(ladder, 0, "max")).toBe(ladder[0]);
  });

  it("snaps a hand-edited amount to the nearest stop", () => {
    // The URL keeps the literal value; only the thumb moves.
    const index = boundToIndex(ladder, 52_000_000, 0);
    expect(ladder[index]).toBe(50_000_000);
  });
});

describe("describeBigoRange", () => {
  it("describes each shape of range", () => {
    expect(describeBigoRange(10_000_000, 5_000_000_000, translate)).toBe(
      "Rs 1.00 Crore – Rs 5.00 Arab",
    );
    expect(describeBigoRange(50_000_000, undefined, translate)).toBe(
      "Rs 5.00 Crore and above",
    );
    expect(describeBigoRange(undefined, 50_000_000, translate)).toBe(
      "Up to Rs 5.00 Crore",
    );
    expect(describeBigoRange(undefined, undefined, translate)).toBe("Any amount");
  });
});
