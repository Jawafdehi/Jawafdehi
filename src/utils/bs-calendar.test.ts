import { describe, it, expect } from "vitest";
import { adStringToBSString } from "./bs-calendar";

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
