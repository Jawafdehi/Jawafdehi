import { describe, expect, it } from "vitest";

import { caseMetaDescription, SITE_NAME } from "./seo";

/**
 * `worker.ts` and `CaseDetail.tsx` render the same case's head — the worker for a
 * case published since the last build, the pre-rendered file for every other.
 * They used to end their description chains differently (the worker at a generic
 * sentence, the page at `""`), which was invisible while case pages were never
 * pre-rendered because the worker always answered. It stops being invisible the
 * moment a static file shadows it.
 */
describe("caseMetaDescription", () => {
  const GENERIC = `A verified corruption and misconduct case documented by ${SITE_NAME}.`;

  it("prefers the full description, stripped of markup and markdown", () => {
    expect(
      caseMetaDescription({
        description: "<p>**Embezzlement** of Rs 4.5 crore</p>",
        short_description: "ignored",
        key_allegations: ["ignored"],
      }),
    ).toBe("Embezzlement of Rs 4.5 crore");
  });

  it("falls back to the first two allegations", () => {
    expect(
      caseMetaDescription({
        description: "",
        key_allegations: ["Forged certificates", "Payroll fraud", "Not included"],
      }),
    ).toBe("Forged certificates. Payroll fraud");
  });

  it("falls back to short_description, which is where most of the archive is", () => {
    // 379 of 463 published cases have neither of the two fields above, and 452
    // have this one. Without this rung most case pages carry no description at
    // all, or — worse — all carry the same generic sentence.
    expect(
      caseMetaDescription({
        description: null,
        key_allegations: [],
        short_description: "Fake academic certificate used to obtain a teaching licence.",
      }),
    ).toBe("Fake academic certificate used to obtain a teaching licence.");
  });

  it("never returns an empty string", () => {
    for (const input of [
      {},
      { description: "", short_description: "", key_allegations: [] },
      { description: null, short_description: null, key_allegations: null },
      { description: "   ", short_description: "\n\t", key_allegations: ["", "  "] },
      { description: "<p></p>", short_description: "<div> </div>" },
    ]) {
      expect(caseMetaDescription(input)).toBe(GENERIC);
    }
  });

  it("truncates to the 160-character meta budget", () => {
    const result = caseMetaDescription({ description: "ल".repeat(400) });
    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith("…")).toBe(true);
  });

  it("tries short_description after the long fields, so no existing description changes", () => {
    // Ordering matters for the 84 cases that have both: putting the curated
    // summary first would silently rewrite descriptions that are already fine.
    expect(
      caseMetaDescription({
        description: "The long body text.",
        short_description: "The curated summary.",
      }),
    ).toBe("The long body text.");
  });
});
