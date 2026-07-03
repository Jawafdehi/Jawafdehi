import { describe, it, expect } from "vitest";
import { formatAmountInput, stripAmountFormatting } from "./number";

describe("formatAmountInput", () => {
  it("groups with Indian (lakh/crore) separators", () => {
    expect(formatAmountInput("0")).toBe("0");
    expect(formatAmountInput("999")).toBe("999");
    expect(formatAmountInput("1000")).toBe("1,000");
    expect(formatAmountInput("1250000")).toBe("12,50,000");
    expect(formatAmountInput("86987106")).toBe("8,69,87,106");
    expect(formatAmountInput("185850000")).toBe("18,58,50,000");
  });

  it("keeps precision beyond Number.MAX_SAFE_INTEGER (string-based)", () => {
    expect(formatAmountInput("123456789012345678901")).toBe("12,34,56,78,90,12,34,56,78,901");
  });

  it("preserves partial decimal input as typed", () => {
    expect(formatAmountInput("1250000.")).toBe("12,50,000.");
    expect(formatAmountInput("1250000.75")).toBe("12,50,000.75");
  });

  it("returns non-numeric input unchanged for the field validator to flag", () => {
    expect(formatAmountInput("")).toBe("");
    expect(formatAmountInput("12abc")).toBe("12abc");
    expect(formatAmountInput("-5")).toBe("-5");
  });
});

describe("stripAmountFormatting", () => {
  it("removes grouping commas and spaces", () => {
    expect(stripAmountFormatting("18,58,50,000")).toBe("185850000");
    expect(stripAmountFormatting("12,50,000.75")).toBe("1250000.75");
    expect(stripAmountFormatting(" 1 000 ")).toBe("1000");
  });
});
