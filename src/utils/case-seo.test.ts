// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";

import type { Case } from "@/types/jds";

import { caseJsonLd } from "./case-jsonld";
import { caseMetaTitle } from "./seo";

// Fictional throughout, per this repo's fixture rule: a fixture asserting
// corruption must not name a real body or person. Case numbers are 099-* so
// they cannot collide with a real register entry.
const COURT_IRI = "https://jawafdehi.org/courtcase/kathmandudc/099-c4-9001";

describe("caseMetaTitle", () => {
  it("adds the lead court number to a title that lacks it", () => {
    expect(caseMetaTitle({ title: "Namuna Cooperative Fraud", court_cases: [COURT_IRI] })).toBe(
      "Namuna Cooperative Fraud (099-C4-9001) | Jawafdehi",
    );
  });

  it("leaves a title that already carries the number alone", () => {
    expect(
      caseMetaTitle({ title: "नमुना खरिद प्रकरण (099-C4-9001)", court_cases: [COURT_IRI] }),
    ).toBe("नमुना खरिद प्रकरण (099-C4-9001) | Jawafdehi");
  });

  it("recognises the number written in Devanagari digits, or lower case", () => {
    expect(
      caseMetaTitle({ title: "मुद्दा नं. ०९९-C4-९००१", court_cases: [COURT_IRI] }),
    ).toBe("मुद्दा नं. ०९९-C4-९००१ | Jawafdehi");
    expect(caseMetaTitle({ title: "x 099-c4-9001", court_cases: [COURT_IRI] })).toBe(
      "x 099-c4-9001 | Jawafdehi",
    );
  });

  it("uses the LEAD court case — the first listed — and reads the legacy form", () => {
    expect(
      caseMetaTitle({
        title: "Namuna",
        court_cases: ["special:099-CR-0001", "https://jawafdehi.org/courtcase/supreme/099-ap-0002"],
      }),
    ).toBe("Namuna (099-CR-0001) | Jawafdehi");
  });

  it("is just the title when the case has no court case", () => {
    expect(caseMetaTitle({ title: "Namuna", court_cases: [] })).toBe("Namuna | Jawafdehi");
    expect(caseMetaTitle({ title: "Namuna" })).toBe("Namuna | Jawafdehi");
  });
});

function aCase(overrides: Partial<Case> = {}): Case {
  return {
    title: "Namuna Cooperative Fraud",
    state: "PUBLISHED",
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
    case_publish_date: "2026-01-03",
    court_cases: [COURT_IRI],
    authors: [{ slug: "namuna-lekhak", display_name: "Namuna Lekhak" }],
    evidence: [
      {
        material_iri: "https://jawafdehi.org/material/document/099-namuna",
        material: { display_name: "Namuna charge sheet" },
      },
    ],
    entities: [
      {
        nes_id: "https://jawafdehi.org/entity/person/namuna-abhiyukta",
        display_name: "Namuna Abhiyukta",
        entity_type: "Person",
        type: "accused",
        outcome: "charged",
      },
      {
        nes_id: "https://jawafdehi.org/entity/person/namuna-abhiyukta",
        display_name: "Namuna Abhiyukta",
        entity_type: "Person",
        type: "related",
      },
      {
        nes_id: "https://jawafdehi.org/entity/person/namuna-sakshi",
        display_name: "Namuna Sakshi",
        entity_type: "Person",
        type: "witness",
      },
      {
        nes_id: "https://jawafdehi.org/entity/location/district/namuna-np0999",
        display_name: "Namuna District",
        entity_type: "AdministrativeArea,jawafdehi:District",
        type: "location",
      },
    ],
    ...overrides,
  } as unknown as Case;
}

const OPTS = {
  canonicalUrl: "https://jawafdehi.org/case/namuna-cooperative-fraud/",
  description: "Namuna description.",
  imageUrl: "https://jawafdehi.org/assets/social-preview.png",
};

describe("caseJsonLd", () => {
  it("is a Report, not a NewsArticle", () => {
    expect(caseJsonLd(aCase(), OPTS)).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Report",
      headline: "Namuna Cooperative Fraud",
      url: OPTS.canonicalUrl,
      datePublished: "2026-01-03",
      dateModified: "2026-11-01T00:00:00Z",
      isAccessibleForFree: true,
    });
  });

  it("is about the accused it names — once each, and without their roles", () => {
    const ld = caseJsonLd(aCase(), OPTS)!;
    expect(ld.about).toEqual([
      { "@type": "Person", "@id": "https://jawafdehi.org/entity/person/namuna-abhiyukta", name: "Namuna Abhiyukta" },
    ]);
    // Roles and verdicts belong on the page, with their forum and context.
    expect(JSON.stringify(ld)).not.toMatch(/accused|witness|charged/);
  });

  it("never ties a witness, a victim or an unknown-type party's name to the report", () => {
    // The snippet names only accused and alleged roles; the graph must not say more.
    const ld = caseJsonLd(
      aCase({
        entities: [
          { nes_id: "https://jawafdehi.org/entity/person/namuna-sakshi", display_name: "Namuna Sakshi", entity_type: "Person", type: "witness" },
          { nes_id: "https://jawafdehi.org/entity/person/namuna-pidit", display_name: "Namuna Pidit", entity_type: "Person", type: "victim" },
          { nes_id: "https://jawafdehi.org/entity/person/namuna-ajnat", display_name: "Namuna Ajnat", type: "related" },
          { nes_id: "https://jawafdehi.org/entity/person/namuna-aaropit", display_name: "Namuna Aaropit", entity_type: "Person", type: "alleged" },
          { nes_id: "https://jawafdehi.org/entity/organization/namuna-bank", display_name: "Namuna Bank", entity_type: "Organization", type: "victim" },
        ],
      } as Partial<Case>),
      OPTS,
    )!;
    expect(ld.about).toEqual([
      { "@type": "Person", "@id": "https://jawafdehi.org/entity/person/namuna-aaropit", name: "Namuna Aaropit" },
      { "@type": "Organization", "@id": "https://jawafdehi.org/entity/organization/namuna-bank", name: "Namuna Bank" },
    ]);
    expect(JSON.stringify(ld)).not.toMatch(/Sakshi|Pidit|Ajnat/);
  });

  it("puts places in spatialCoverage, minus the registry's own subtypes", () => {
    expect(caseJsonLd(aCase(), OPTS)!.spatialCoverage).toEqual([
      { "@type": "Place", "@id": "https://jawafdehi.org/entity/location/district/namuna-np0999", name: "Namuna District" },
    ]);
  });

  it("mentions its court cases and cites its evidence", () => {
    const ld = caseJsonLd(aCase(), OPTS)!;
    expect(ld.mentions).toEqual([
      { "@type": "CreativeWork", "@id": COURT_IRI, url: COURT_IRI, name: "099-C4-9001" },
    ]);
    expect(ld.citation).toEqual([
      {
        "@type": "CreativeWork",
        url: "https://jawafdehi.org/material/document/099-namuna",
        name: "Namuna charge sheet",
      },
    ]);
  });

  it("credits its authors, linking their profiles, and falls back to the publisher", () => {
    expect(caseJsonLd(aCase(), OPTS)!.author).toEqual([
      { "@type": "Person", name: "Namuna Lekhak", url: "https://jawafdehi.org/author/namuna-lekhak" },
    ]);
    expect(caseJsonLd(aCase({ authors: [] }), OPTS)!.author).toMatchObject({
      "@type": "Organization",
      name: "Jawafdehi Initiative",
    });
  });

  it("leaves a long title out of headline instead of cutting off its outcome", () => {
    const title = `${"क".repeat(150)} लाई सफाई`;
    const ld = caseJsonLd(aCase({ title }), OPTS)!;
    expect(ld).not.toHaveProperty("headline");
    expect(ld.name).toBe(title);
    expect(JSON.stringify(ld)).not.toContain("…");
  });

  it("uses the whole title as headline when it fits", () => {
    const title = "क".repeat(110);
    expect(caseJsonLd(aCase({ title }), OPTS)!.headline).toBe(title);
  });

  it("publishes nothing for a case that is not published", () => {
    expect(caseJsonLd(aCase({ state: "IN_REVIEW" } as Partial<Case>), OPTS)).toBeNull();
  });
});
