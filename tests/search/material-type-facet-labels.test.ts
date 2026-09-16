import { describe, it, expect } from "vitest";

import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import { materialTypeKeyFor } from "@/lib/material-type-labels";
import { getFacetItemLabel } from "@/utils/case-entities";

/**
 * The Document type facet's labels, against the REAL bundles.
 *
 * The component test mocks `t`, so it can only prove the right key is asked for.
 * This proves the key resolves — in both languages, for every token the API can
 * put in a bucket. The failure it guards against is quiet: a new MaterialType
 * lands on the API side (that end is pinned by
 * `test_material_type_enum_tracks_material_types`), arrives here as a bucket, and
 * renders as "other" or as a dotted key path at a reader.
 */

// The closed vocabulary, mirroring search.service.ALL_MATERIAL_TYPES. A literal
// on purpose: this file's whole job is to disagree with the API when the two
// drift, and deriving it from the same place the code reads would make that
// impossible.
const ALL_MATERIAL_TYPES = [
  "charge_sheet",
  "court_case",
  "court_order",
  "document",
  "legal_corpus",
  "manuscript",
  "news",
  "official_report",
  "precedent",
  "press_release",
  "procurement_notice",
  "social_media",
] as const;

const bundles = { en, ne } as Record<string, Record<string, unknown>>;

function labelFrom(locale: string, key: string): unknown {
  const types = (
    (bundles[locale].dataQuality as Record<string, Record<string, unknown>>)
      .materialsByType as Record<string, Record<string, unknown>>
  ).type;
  return types[key];
}

describe("every material_type token has a label in both bundles", () => {
  it.each(ALL_MATERIAL_TYPES)("%s", (token) => {
    const key = materialTypeKeyFor(token);
    // "other" is the fallback for a token this map has never heard of. Every
    // token in the closed vocabulary must map to its own key.
    expect(key).not.toBe("other");
    for (const locale of ["en", "ne"]) {
      const label = labelFrom(locale, key);
      expect(typeof label, `${locale}: ${key}`).toBe("string");
      expect(String(label).trim(), `${locale}: ${key}`).not.toBe("");
    }
  });

  it("gives the Nepali bundle a genuinely Nepali label, not the English one", () => {
    // A copied English string passes a mere "is it present" check while leaving
    // the facet untranslated. Devanagari is the cheap, reliable tell.
    for (const token of ALL_MATERIAL_TYPES) {
      const key = materialTypeKeyFor(token);
      expect(String(labelFrom("ne", key)), key).toMatch(/[ऀ-ॿ]/);
    }
  });
});

describe("getFacetItemLabel on material_type", () => {
  // The real resolver, so this is the label a reader actually sees.
  const translate = (key: string, fallback?: string) => {
    const parts = key.split(".");
    let node: unknown = en;
    for (const part of parts) {
      node = (node as Record<string, unknown>)?.[part];
      if (node === undefined) return fallback ?? key;
    }
    return typeof node === "string" ? node : (fallback ?? key);
  };

  it("resolves the tokens that carry the corpus", () => {
    expect(
      getFacetItemLabel("material_type", { name: "procurement_notice" }, translate),
    ).toBe("Procurement notices");
    expect(
      getFacetItemLabel("material_type", { name: "charge_sheet" }, translate),
    ).toBe("Charge sheets");
  });

  it("humanizes an unknown token rather than calling it Other", () => {
    // A token minted after this map was written would resolve to "other", and
    // labelling a real document type "Other" is a wrong statement rather than an
    // ugly one. The humanized token is at least accurate.
    expect(
      getFacetItemLabel("material_type", { name: "audit_finding" }, translate),
    ).toBe("audit finding");
  });
});
