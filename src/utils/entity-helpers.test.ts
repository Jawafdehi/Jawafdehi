import { describe, it, expect } from "vitest";

import { entityKindFor, humanizeEntityType } from "@/utils/entity-helpers";

// `entityKindFor` picks the glyph shown on every party card and every entity
// search hit, and it maps an OPEN vocabulary: the API sends raw schema.org /
// jawafdehi: tokens, comma-joined and namespaced, with no frontend contract
// pinning the set. A new upstream type therefore fails silently — it just draws
// the wrong glyph — so the values below are the ones actually observed in
// production, sampled 2026-09-06 from 1,176 case binds (/api/cases/<slug>/) and
// 400 entity hits (/api/search/?type=entity). Re-sample before changing them.
describe("entityKindFor", () => {
  const CASES: ReadonlyArray<readonly [string, "person" | "organization" | "location"]> = [
    // Case-bind `entity_type` values, by observed frequency.
    ["Person", "person"],
    ["Organization", "organization"],
    ["AdministrativeArea,jawafdehi:District", "location"],
    ["AdministrativeArea,jawafdehi:Province", "location"],
    ["Place", "location"],
    ["AdministrativeArea,jawafdehi:Municipality", "location"],
    ["GovernmentOrganization", "organization"],
    ["AdministrativeArea,jawafdehi:MetropolitanCity", "location"],
    ["AdministrativeArea", "location"],
    ["AdministrativeArea,jawafdehi:RuralMunicipality", "location"],
    ["AdministrativeArea,jawafdehi:SubMetropolitanCity", "location"],
    ["Courthouse", "organization"],
    ["EducationalOrganization", "organization"],
    // Additional `extra.type` values seen only on search hits.
    ["Organization,Corporation", "organization"],
    ["Organization,GovernmentOrganization", "organization"],
    ["jawafdehi:JudicialBody", "organization"],
    ["Organization,jawafdehi:PoliticalParty", "organization"],
  ];

  it.each(CASES)("maps the API type %s to the %s glyph", (type, expected) => {
    expect(entityKindFor(type)).toBe(expected);
  });

  // The resolved NES record carries a lowercase kind derived from its IRI path,
  // used as the fallback when a bind has no curated `entity_type`.
  it.each([
    ["person", "person"],
    ["organization", "organization"],
    ["location", "location"],
  ] as const)("also accepts the resolved record's lowercase %s", (type, expected) => {
    expect(entityKindFor(type)).toBe(expected);
  });

  // Documented, deliberate default. It is a real assertion about a named party,
  // so if an unmapped type ever reaches production it should be added above
  // rather than left to render as a person.
  it.each([null, undefined, "", "CreativeWork"])(
    "falls back to the person glyph for the unmapped value %s",
    (type) => {
      expect(entityKindFor(type)).toBe("person");
    },
  );

  // The two helpers run side by side on the search card: one picks the glyph,
  // the other the caption. They must not describe different things.
  it("agrees with humanizeEntityType on the generic kinds it localises", () => {
    expect(entityKindFor("Person")).toBe("person");
    expect(humanizeEntityType("Person")).toBe("Person");
    expect(entityKindFor("Place")).toBe("location");
    expect(humanizeEntityType("Place")).toBe("Place");
    // A specific subtype keeps the index's own wording and still gets the right glyph.
    expect(entityKindFor("AdministrativeArea,jawafdehi:District")).toBe("location");
    expect(humanizeEntityType("AdministrativeArea,jawafdehi:District")).toBe("District");
  });
});
