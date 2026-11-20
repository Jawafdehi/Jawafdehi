import { describe, it, expect } from "vitest";
import { formatAmountInput, formatBigo, formatCompactCount, formatCount, localiseNumber, stripAmountFormatting } from "./number";

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

describe("counts follow the lakh/crore rule", () => {
  it("formatCount groups the Nepali way", () => {
    expect(formatCount(2_311_969)).toBe("23,11,969");
    expect(formatCount(2_847)).toBe("2,847");
    expect(formatCount(1234.567, { maximumFractionDigits: 2 })).toBe("1,234.57");
  });

  it("formatCompactCount stays exact under a lakh and uses Lakh/Crore above", () => {
    expect(formatCompactCount(99_999)).toBe("99,999");
    expect(formatCompactCount(368_946)).toBe("3.69 Lakh");
    expect(formatCompactCount(2_311_969)).toBe("23.12 Lakh");
    expect(formatCompactCount(2_300_000)).toBe("23 Lakh");
    expect(formatCompactCount(15_000_000)).toBe("1.5 Crore");
  });
});

describe("figures in the reader's language", () => {
  it("leaves English as it is", () => {
    expect(formatBigo(272_000_000_000, "en")).toBe("Rs 2.72 Kharab");
    expect(localiseNumber("23.12 Lakh", "en")).toBe("23.12 Lakh");
  });

  it("writes Nepali units and digits in Nepali", () => {
    expect(formatBigo(272_000_000_000, "ne")).toBe("रु. २.७२ खर्ब");
    expect(formatBigo(24_940_110, "ne")).toBe("रु. २.४९ करोड");
    expect(formatCompactCount(2_311_969, "ne")).toBe("२३.१२ लाख");
    expect(formatCount(2_847, undefined, "ne")).toBe("२,८४७");
  });
});
