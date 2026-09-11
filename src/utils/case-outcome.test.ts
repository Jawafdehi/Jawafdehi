import { describe, it, expect } from "vitest";
import type { EntityOutcome } from "@/types/jds";
import {
  outcomeBadgeClass,
  outcomeLabel,
  outcomeRank,
  outcomeWithForumLabel,
  shouldShowOutcome,
} from "./case-outcome";

describe("case-outcome", () => {
  it("outcomeLabel returns the localized label (unknown language falls back to en)", () => {
    expect(outcomeLabel("acquitted", "en")).toBe("Acquitted");
    expect(outcomeLabel("acquitted", "ne")).toBe("सफाइ");
    expect(outcomeLabel("convicted", "ne")).toBe("दोषी ठहर");
    expect(outcomeLabel("acquitted", "fr")).toBe("Acquitted");
  });

  it("coerces an unexpected or uppercase value instead of crashing (default charged)", () => {
    expect(outcomeLabel("CONVICTED" as EntityOutcome, "en")).toBe("Convicted");
    expect(outcomeLabel("bogus" as EntityOutcome, "en")).toBe("Charged");
    expect(outcomeBadgeClass("ACQUITTED" as EntityOutcome)).toContain("success");
    // unknown -> charged -> warning tone
    expect(outcomeBadgeClass("bogus" as EntityOutcome)).toContain("alert");
  });

  it("shouldShowOutcome surfaces only decided outcomes", () => {
    expect(shouldShowOutcome("convicted")).toBe(true);
    expect(shouldShowOutcome("acquitted")).toBe(true);
    expect(shouldShowOutcome("charged")).toBe(false);
    expect(shouldShowOutcome(undefined)).toBe(false);
    expect(shouldShowOutcome(null)).toBe(false);
    // an uppercase CHARGED is also suppressed
    expect(shouldShowOutcome("CHARGED" as EntityOutcome)).toBe(false);
  });
});

// A verdict is named with its FORUM and asserts nothing about finality.
// 22 published cases carry a Special Court acquittal with a live CIAA appeal at
// the Supreme Court, and the CIAA routinely appeals only SOME defendants — so
// "acquitted — appeal pending" is wrong for whoever it does not apply to, and a
// bare "Acquitted" overstates what a first-instance verdict settles. Naming the
// forum is true for everyone.
describe("outcomeWithForumLabel", () => {
  it("names the forum and the verdict, in both languages", () => {
    expect(outcomeWithForumLabel("acquitted", "Special Court", "en")).toBe(
      "Special Court: acquitted",
    );
    expect(outcomeWithForumLabel("acquitted", "विशेष अदालत", "ne")).toBe(
      "विशेष अदालत: सफाइ",
    );
    expect(outcomeWithForumLabel("convicted", "Special Court", "en")).toBe(
      "Special Court: convicted",
    );
  });

  it("asserts nothing about finality or pendency", () => {
    const label = outcomeWithForumLabel("acquitted", "Special Court", "en");
    expect(label).not.toMatch(/pending|final|upheld|appeal/i);
  });

  it("falls back to the bare verdict when no single forum can be named", () => {
    // Twelve dockets across eight courts: picking one would be a guess.
    expect(outcomeWithForumLabel("acquitted", null, "en")).toBe("Acquitted");
    expect(outcomeWithForumLabel("acquitted", "", "en")).toBe("Acquitted");
    expect(outcomeWithForumLabel("acquitted", undefined, "ne")).toBe("सफाइ");
  });
});

describe("remanded", () => {
  it("keeps its own label instead of collapsing into charged", () => {
    expect(outcomeLabel("remanded", "en")).toBe("Remanded for retrial");
    expect(outcomeLabel("remanded", "ne")).toBe("बदर गरी पुनः इन्साफ");
  });

  it("is shown, because a quashed conviction is not an undecided case", () => {
    // Collapsing it into `charged` suppressed the badge entirely: a defendant
    // whose conviction was quashed rendered identically to one never decided.
    expect(shouldShowOutcome("remanded")).toBe(true);
  });

  it("sorts after the terminal verdicts but before the undecided", () => {
    expect(outcomeRank("remanded")).toBeGreaterThan(outcomeRank("abated"));
    expect(outcomeRank("remanded")).toBeLessThan(outcomeRank("charged"));
  });

  it("has a badge class of its own", () => {
    expect(outcomeBadgeClass("remanded")).not.toBe(outcomeBadgeClass("charged"));
  });
});
