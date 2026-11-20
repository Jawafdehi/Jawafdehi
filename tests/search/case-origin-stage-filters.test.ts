import { describe, expect, it } from "vitest";

import { filterGroupsFor } from "@/components/search/filter-groups";
import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import { getFacetItemLabel } from "@/utils/case-entities";

/**
 * The Cases tab's Case origin and Case status filters, against the REAL bundles.
 *
 * The vocabularies mirror the API (cases.search_index: the CaseTrack values for
 * origin, CASE_STAGE_VALUES for status). Literals on purpose, so this file
 * disagrees with the API when the two drift.
 */
const ORIGINS = ["ciaa", "money_laundering", "public_prosecutor", "writ", "arbitration", "other"];
const STAGES = [
  "under_investigation",
  "at_special_court",
  "special_court_verdict",
  "at_supreme_court",
  "supreme_court_verdict",
  "other",
];

function translator(bundle: unknown) {
  return (key: string, fallback?: string) => {
    let node: unknown = bundle;
    for (const part of key.split(".")) {
      node = (node as Record<string, unknown>)?.[part];
      if (node === undefined) return fallback ?? key;
    }
    return typeof node === "string" ? node : (fallback ?? key);
  };
}

describe("Case origin and Case status filters", () => {
  it("appear on the Cases tab and nowhere else", () => {
    const names = (type?: Parameters<typeof filterGroupsFor>[0]) =>
      filterGroupsFor(type).map((group) => group.name);
    expect(names("case")).toEqual(expect.arrayContaining(["case_origin", "case_stage"]));
    for (const type of ["all", "entity", "material", "courtcase"] as const) {
      expect(names(type)).not.toContain("case_origin");
      expect(names(type)).not.toContain("case_stage");
    }
  });

  it.each([
    ["en", en],
    ["ne", ne],
  ])("label every value in %s", (_lang, bundle) => {
    const translate = translator(bundle);
    for (const name of ORIGINS) {
      const label = getFacetItemLabel("case_origin", { name }, translate);
      expect(label).not.toContain("archiveSearch.");
      expect(label).not.toBe(name);
    }
    for (const name of STAGES) {
      const label = getFacetItemLabel("case_stage", { name }, translate);
      expect(label).not.toContain("archiveSearch.");
      expect(label).not.toBe(name);
    }
  });

  it("reads the two that name a body plainly", () => {
    const translate = translator(en);
    expect(getFacetItemLabel("case_origin", { name: "ciaa" }, translate)).toBe("CIAA");
    expect(getFacetItemLabel("case_stage", { name: "special_court_verdict" }, translate)).toBe(
      "Special Court verdict",
    );
  });

  it("humanizes a value the API adds before this list does", () => {
    const translate = translator(en);
    expect(getFacetItemLabel("case_stage", { name: "at_high_court" }, translate)).toBe("at high court");
  });
});
