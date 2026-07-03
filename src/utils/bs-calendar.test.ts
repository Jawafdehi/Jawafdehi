import { describe, it, expect } from "vitest";
import { adStringToBSString, normalizeBSDateString } from "./bs-calendar";

describe("adStringToBSString", () => {
  it("converts a known Gregorian date to Bikram Sambat", () => {
    // 2023-01-01 AD == 2079-09-17 BS (Poush 17, 2079).
    expect(adStringToBSString("2023-01-01")).toBe("2079-09-17");
  });

  it("handles single-digit month/day input", () => {
    expect(adStringToBSString("2023-1-1")).toBe("2079-09-17");
  });

  it("returns null for empty / malformed / out-of-range input", () => {
    expect(adStringToBSString("")).toBeNull();
    expect(adStringToBSString(null)).toBeNull();
    expect(adStringToBSString("not-a-date")).toBeNull();
    expect(adStringToBSString("2023-13-01")).toBeNull();
    expect(adStringToBSString("2023-01-40")).toBeNull();
  });
});

describe("normalizeBSDateString", () => {
  it("passes through a canonical ASCII BS date", () => {
    expect(normalizeBSDateString("2082-03-01")).toBe("2082-03-01");
  });

  it("transliterates Devanagari numerals (the @sbmdkl picker's ne output)", () => {
    expect(normalizeBSDateString("२०८२-०२-२२")).toBe("2082-02-22");
  });

  it("zero-pads single-digit month/day", () => {
    expect(normalizeBSDateString("2082-3-1")).toBe("2082-03-01");
    expect(normalizeBSDateString("२०८२-३-१")).toBe("2082-03-01");
  });

  it("rejects the picker's NaN artifact and other garbage", () => {
    expect(normalizeBSDateString("-०-०")).toBeNull();
    expect(normalizeBSDateString("-0-0")).toBeNull();
    expect(normalizeBSDateString("")).toBeNull();
    expect(normalizeBSDateString(null)).toBeNull();
    expect(normalizeBSDateString(undefined)).toBeNull();
    expect(normalizeBSDateString("2082-13-01")).toBeNull();
    expect(normalizeBSDateString("2082-01-33")).toBeNull();
    expect(normalizeBSDateString("not-a-date")).toBeNull();
  });
});
