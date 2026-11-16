import { describe, expect, it } from "vitest";

import CASE_TAG_LABELS from "@/data/case-tags.json";
import { caseTagLabel } from "@/lib/case-tags";

describe("caseTagLabel", () => {
  it("shows the Nepali name in Nepali", () => {
    expect(caseTagLabel("tax-evasion", "ne")).toBe("कर छली");
  });

  it("shows the English name in English", () => {
    expect(caseTagLabel("tax-evasion", "en")).toBe("Tax Evasion");
  });

  it("treats any non-Nepali language as English", () => {
    expect(caseTagLabel("bribery", "en-US")).toBe("Bribery");
  });

  it("shows an unknown tag as stored rather than dropping it", () => {
    expect(caseTagLabel("एनसेल प्रकरण", "en")).toBe("एनसेल प्रकरण");
    expect(caseTagLabel("not-yet-synced", "ne")).toBe("not-yet-synced");
  });

  it("has both names for every tag", () => {
    const missing = Object.entries(CASE_TAG_LABELS).filter(
      ([, labels]) => !labels.en.trim() || !labels.ne.trim(),
    );
    expect(missing).toEqual([]);
  });
});

describe("the Tags search filter", () => {
  // The facet labels go through getFacetItemLabel, not caseTagLabel directly.
  it("labels a tag bucket in the reader's language", async () => {
    const { getFacetItemLabel } = await import("@/utils/case-entities");
    const translate = (_key: string, fallback?: string) => fallback ?? "";
    expect(getFacetItemLabel("tags", { name: "bribery" }, translate, "ne")).toBe(
      "घुस रिसवत",
    );
    expect(getFacetItemLabel("tags", { name: "bribery" }, translate, "en")).toBe(
      "Bribery",
    );
    // A legacy keyword still indexed into the facet shows as stored.
    expect(getFacetItemLabel("tags", { name: "CORRUPTION" }, translate, "en")).toBe(
      "CORRUPTION",
    );
  });
});
