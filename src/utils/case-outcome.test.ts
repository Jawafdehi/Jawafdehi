import { describe, it, expect } from "vitest";
import type { EntityOutcome } from "@/types/jds";
import { outcomeBadgeClass, outcomeLabel, shouldShowOutcome } from "./case-outcome";

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
    expect(outcomeBadgeClass("ACQUITTED" as EntityOutcome)).toContain("emerald");
    // unknown -> charged -> amber
    expect(outcomeBadgeClass("bogus" as EntityOutcome)).toContain("amber");
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
