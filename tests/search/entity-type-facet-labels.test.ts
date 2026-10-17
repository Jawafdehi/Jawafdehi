import { describe, it, expect } from "vitest";

import en from "@/i18n/locales/en.json";
import ne from "@/i18n/locales/ne.json";
import { getFacetItemLabel } from "@/utils/case-entities";
import { entityTypeToken } from "@/utils/entity-helpers";

/**
 * The Entity type facet's labels, against the REAL bundles.
 *
 * The facet used to render the raw bucket value, which is a schema.org `@type`
 * — comma-joined when a record declares more than one class, and still carrying
 * the `jawafdehi:` CURIE. In the sidebar's width three of them truncated to the
 * identical `AdministrativeArea,jaw…`, so a reader got three checkboxes that
 * looked the same and selected different things, on a Nepali-first site, in
 * English, in a notation nobody outside the schema uses.
 *
 * Same guard as the Document type suite next door: the component test mocks `t`
 * and can only prove the right key is asked for; this proves the key resolves,
 * in both languages, for every value the API can actually put in a bucket.
 */

// Every raw `type` token the entity index emits, from /api/statistics/ by_type
// on 2026-10-13. A literal on purpose: this file's job is to disagree with the
// API when the two drift, which deriving it from the same place would prevent.
const LIVE_ENTITY_TYPES = [
  "Person",
  "Hospital",
  "GovernmentOrganization",
  "Organization",
  "AdministrativeArea,jawafdehi:RuralMunicipality",
  "AdministrativeArea,jawafdehi:Municipality",
  "EducationalOrganization",
  "Organization,jawafdehi:PoliticalParty",
  "Place",
  "Organization,Corporation",
  "AdministrativeArea,jawafdehi:District",
  "Organization,NGO",
  "Courthouse",
  "Organization,GovernmentOrganization",
  "AdministrativeArea,jawafdehi:SubMetropolitanCity",
  "AdministrativeArea",
  "AdministrativeArea,jawafdehi:Province",
  "AdministrativeArea,jawafdehi:MetropolitanCity",
  "jawafdehi:JudicialBody",
  "jawafdehi:InternationalOrganization",
] as const;

const bundles = { en, ne } as Record<string, Record<string, unknown>>;

function labelFrom(locale: string, token: string): unknown {
  const filters = (
    bundles[locale].archiveSearch as Record<string, Record<string, unknown>>
  ).filters as Record<string, Record<string, unknown>>;
  return filters.entityTypeValue[token];
}

/** The real `t`: resolves a dotted key against a bundle, else returns the key. */
const translateWith =
  (locale: string) =>
  (key: string): string => {
    const value = key
      .split(".")
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === "object"
            ? (node as Record<string, unknown>)[part]
            : undefined,
        bundles[locale],
      );
    return typeof value === "string" ? value : key;
  };

describe("every live entity_type bucket resolves to a real label", () => {
  it.each(LIVE_ENTITY_TYPES)("%s", (raw) => {
    for (const locale of ["en", "ne"]) {
      const label = getFacetItemLabel(
        "entity_type",
        { name: raw },
        translateWith(locale),
        locale,
      );
      // Never the raw token, never a dotted key path, never empty.
      expect(label, `${locale}: ${raw}`).not.toBe(raw);
      expect(label, `${locale}: ${raw}`).not.toContain("archiveSearch.");
      expect(label.trim(), `${locale}: ${raw}`).not.toBe("");
      // Never a leaked CURIE or a comma-joined compound.
      expect(label, `${locale}: ${raw}`).not.toContain("jawafdehi:");
      expect(label, `${locale}: ${raw}`).not.toContain(",");
    }
  });

  it("gives the Nepali bundle a genuinely Nepali label, not the English one", () => {
    // A copied English string passes a mere "is it present" check while leaving
    // the facet untranslated. Devanagari is the cheap, reliable tell.
    for (const raw of LIVE_ENTITY_TYPES) {
      const token = entityTypeToken(raw)!;
      expect(String(labelFrom("ne", token)), token).toMatch(/[ऀ-ॿ]/);
    }
  });

  it("collapses the two spellings of a government office into one label", () => {
    // `GovernmentOrganization` and `Organization,GovernmentOrganization` are the
    // same institution declared two ways — 2,682 documents and 9. Keying the
    // label on the canonical token is what stops them reading as two different
    // things in a list of checkboxes.
    const t = translateWith("en");
    expect(getFacetItemLabel("entity_type", { name: "GovernmentOrganization" }, t)).toBe(
      getFacetItemLabel(
        "entity_type",
        { name: "Organization,GovernmentOrganization" },
        t,
      ),
    );
  });

  it("distinguishes the three area kinds that used to truncate alike", () => {
    // The reported bug: `AdministrativeArea,jawafdehi:{Municipality,
    // RuralMunicipality,District}` all cut to `AdministrativeArea,jaw…`.
    const t = translateWith("ne");
    const labels = [
      "AdministrativeArea,jawafdehi:Municipality",
      "AdministrativeArea,jawafdehi:RuralMunicipality",
      "AdministrativeArea,jawafdehi:District",
    ].map((raw) => getFacetItemLabel("entity_type", { name: raw }, t));
    expect(new Set(labels).size).toBe(3);
  });

  it("falls back to a humanized class for a token it has never seen", () => {
    // A new `@type` on the API side must read as English words, not as a dotted
    // key path — the same discipline case_type and material_type follow.
    const label = getFacetItemLabel(
      "entity_type",
      { name: "Organization,jawafdehi:SportsTeam" },
      translateWith("en"),
    );
    expect(label).toBe("Sports Team");
  });
});
