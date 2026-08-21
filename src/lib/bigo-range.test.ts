import { describe, it, expect } from "vitest";
import {
  boundToIndex,
  buildBigoLadder,
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

// The live corpus: ~रु ४५ हजार to ~रु ६६ अरब.
const CORPUS: BigoExtent = { min: 45_220, max: 66_000_000_000, count: 75 };

describe("hasUsableRails", () => {
  it("needs a recorded amount and finite bounds", () => {
    expect(hasUsableRails(CORPUS)).toBe(true);
    expect(hasUsableRails(undefined)).toBe(false);
    // An older cached response, or a corpus recording no amount: render nothing
    // rather than a slider pinned shut.
    expect(hasUsableRails({ min: 0, max: 0, count: 0 })).toBe(false);
  });
});

describe("the scale is logarithmic, not linear", () => {
  it("puts the median mid-track instead of inside the first pixel", () => {
    // The reason this control cannot use a linear scale, asserted rather than
    // just asserted in prose. Across the 250px sidebar a linear track puts the
    // median case 0.19px from the left edge — half the corpus, and every case
    // worth separating, inside one pixel.
    const ladder = buildBigoLadder(CORPUS);
    const median = 50_000_000;
    const onLadder = boundToIndex(ladder, median, 0) / (ladder.length - 1);
    expect(onLadder).toBeGreaterThan(0.35);
    expect(onLadder).toBeLessThan(0.65);

    const onLinearTrack =
      ((median - CORPUS.min) / (CORPUS.max - CORPUS.min)) * 250;
    expect(onLinearTrack).toBeLessThan(1);
  });
});

describe("buildBigoLadder", () => {
  it("is made of round 1/2/5 amounts only", () => {
    // The point of a ladder: you land on रु १ करोड, never रु १.०३ करोड.
    for (const stop of buildBigoLadder(CORPUS)) {
      const mantissa = stop / 10 ** Math.floor(Math.log10(stop));
      expect([1, 2, 5]).toContain(Math.round(mantissa));
    }
  });

  it("brackets the corpus, so the ends genuinely mean 'no bound'", () => {
    const ladder = buildBigoLadder(CORPUS);
    expect(ladder[0]).toBeLessThanOrEqual(CORPUS.min);
    expect(ladder[ladder.length - 1]).toBeGreaterThanOrEqual(CORPUS.max);
  });

  it("ascends, and spans the corpus in a workable number of stops", () => {
    const ladder = buildBigoLadder(CORPUS);
    expect(ladder).toEqual([...ladder].sort((a, b) => a - b));
    expect(ladder.length).toBeGreaterThan(10);
    expect(ladder.length).toBeLessThan(30);
  });

  it("still yields a draggable track for a corpus of one case", () => {
    // A single recorded amount would otherwise collapse the ladder to one
    // position — a slider that cannot be moved.
    const ladder = buildBigoLadder({ min: 5_000_000, max: 5_000_000, count: 1 });
    expect(ladder.length).toBeGreaterThanOrEqual(2);
  });
});

describe("boundToIndex / indexToBound", () => {
  const ladder = buildBigoLadder(CORPUS);
  const lastIndex = ladder.length - 1;

  it("round-trips a bound that sits on a stop", () => {
    const index = boundToIndex(ladder, 10_000_000, 0);
    expect(indexToBound(ladder, index, "min")).toBe(10_000_000);
  });

  it("snaps an off-ladder bound to the nearest stop without moving the filter", () => {
    // A hand-edited ?bigo_min=52000000 need not sit on a stop, and the thumb has
    // to go somewhere. The snap moves the THUMB; the URL keeps the literal, which
    // is why the pill can read रु ५.२० करोड while the thumb sits at रु ५ करोड.
    const index = boundToIndex(ladder, 52_000_000, 0);
    expect(indexToBound(ladder, index, "min")).toBe(50_000_000);
  });

  it("reads a thumb parked at either end as no bound at all", () => {
    // Full track == no filter. Otherwise "cleared" would be a range that merely
    // happens to match everything, and the URL would carry a bound nobody set.
    expect(indexToBound(ladder, 0, "min")).toBeUndefined();
    expect(indexToBound(ladder, lastIndex, "max")).toBeUndefined();
    // ...but the same positions are real bounds for the OPPOSITE thumb.
    expect(indexToBound(ladder, lastIndex, "min")).toBe(ladder[lastIndex]);
    expect(indexToBound(ladder, 0, "max")).toBe(ladder[0]);
  });

  it("parks a missing bound on the edge it was given", () => {
    expect(boundToIndex(ladder, undefined, 0)).toBe(0);
    expect(boundToIndex(ladder, undefined, lastIndex)).toBe(lastIndex);
  });
});

describe("parseBigoBound", () => {
  it("accepts a plain whole number, including zero", () => {
    expect(parseBigoBound("0")).toBe(0);
    expect(parseBigoBound("10000000")).toBe(10_000_000);
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
    expect(parseBigoBound(String(2n ** 63n))).toBeUndefined();
    expect(parseBigoBound(String(2n ** 64n))).toBeUndefined();
  });

  it("rejects a bound it cannot carry without silently changing its value", () => {
    // Regression. The guard used to compare as BigInt against 2**63-1 and then
    // `return Number(raw)` — so the API's own ceiling was ADMITTED and promptly
    // rounded UP to 2**63 by the float conversion. normalizeArchiveSearchParams
    // writes the parsed number straight back into the URL, so the repair step
    // was itself minting the out-of-range bound that earns the 400 this function
    // exists to prevent. Anything past MAX_SAFE_INTEGER is unrepresentable here,
    // and a bound the SPA cannot state exactly is one it must not send.
    expect(parseBigoBound(String(2n ** 63n - 1n))).toBeUndefined();
    expect(
      parseBigoBound(String(BigInt(Number.MAX_SAFE_INTEGER) + 1n)),
    ).toBeUndefined();
    expect(parseBigoBound(String(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it("only ever returns a bound that round-trips through String() unchanged", () => {
    // The property that actually matters: whatever comes back is re-serialised
    // into the URL and into the request, so a value that does not survive the
    // round trip is a filter the reader never asked for.
    for (const raw of [
      "0",
      "45220",
      "10000000",
      "66000000000",
      String(Number.MAX_SAFE_INTEGER),
    ]) {
      expect(String(parseBigoBound(raw))).toBe(raw);
    }
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

  it("drops only the unusable half", () => {
    expect(read("bigo_min=abc&bigo_max=500")).toEqual({
      min: undefined,
      max: 500,
    });
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
