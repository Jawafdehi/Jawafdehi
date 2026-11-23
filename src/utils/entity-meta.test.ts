// SPDX-License-Identifier: Hippocratic-3.0
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import type { Case } from "@/types/jds";

import { bilingualName, entityJsonLd, entityMeta } from "./entity-meta";

const LABELS: Record<string, string> = {
  "entityDetail.relationTypeAccused": "अभियुक्त",
  "entityDetail.relationTypeAlleged": "आरोपित",
  "entityDetail.relationTypeWitness": "साक्षी",
  "entityDetail.relationTypeVictim": "पीडित",
  "entityDetail.caseOne": "मुद्दा",
  "entityDetail.cases": "मुद्दाहरू",
};
const t = ((key: string) => LABELS[key] ?? key) as unknown as TFunction;

const IRI = "https://jawafdehi.org/entity/person/hari-bahadur-thapa";
const OTHER = "https://jawafdehi.org/entity/person/someone-else";

function aCase(
  slug: string,
  title: string,
  bind: { type: string; outcome?: string | null },
  started = "2023-01-01",
): Case {
  return {
    id: slug.length,
    slug,
    title,
    case_type: "CORRUPTION",
    proceedings_started_on: started,
    created_at: "2026-06-10T00:00:00Z",
    dates: { stages: [] },
    entities: [
      { nes_id: IRI, display_name: "हरि बहादुर थापा", type: bind.type, outcome: bind.outcome ?? null },
      { nes_id: OTHER, display_name: "अर्को व्यक्ति", type: "accused", outcome: "convicted" },
    ],
  } as unknown as Case;
}

const NAMES = { en: "Hari Bahadur Thapa", ne: "हरि बहादुर थापा" };

function meta(cases: Case[], extra: Partial<Parameters<typeof entityMeta>[0]> = {}) {
  return entityMeta({
    names: NAMES,
    fallbackName: "Hari Bahadur Thapa",
    kindLabel: "व्यक्ति",
    language: "ne",
    entityIri: IRI,
    cases,
    caseCount: cases.length,
    recordDescription: "",
    t,
    ...extra,
  });
}

describe("bilingualName", () => {
  it("puts the page's language first and carries both scripts", () => {
    expect(bilingualName(NAMES, "ne", "x")).toBe("हरि बहादुर थापा · Hari Bahadur Thapa");
    expect(bilingualName(NAMES, "en", "x")).toBe("Hari Bahadur Thapa · हरि बहादुर थापा");
  });

  it("does not repeat a name the record holds once, and falls back when it holds none", () => {
    expect(bilingualName({ en: "", ne: "रवि" }, "en", "x")).toBe("रवि");
    expect(bilingualName({ en: "Same", ne: "Same" }, "ne", "x")).toBe("Same");
    expect(bilingualName({ en: "", ne: "" }, "ne", "fallback")).toBe("fallback");
  });
});

describe("entityMeta", () => {
  it("titles the page in both scripts", () => {
    expect(meta([]).title).toBe("हरि बहादुर थापा · Hari Bahadur Thapa | Jawafdehi");
  });

  it("names an accused role and a decided verdict, the verdict before the case title", () => {
    const { description } = meta([
      aCase("a", "बाराको सडक निर्माणमा बढी भुक्तानी", { type: "accused", outcome: "acquitted" }),
    ]);
    expect(description).toContain("अभियुक्त");
    expect(description).toContain("सफाइ");
    expect(description).toContain("बाराको सडक निर्माणमा बढी भुक्तानी");
    // Truncation can only ever shorten the title, never cut the verdict.
    expect(description.indexOf("सफाइ")).toBeLessThan(description.indexOf("बाराको"));
  });

  it("never claims an undecided case is pending — it says what the page says", () => {
    // "charged" can mean only that no outcome is recorded; the card shows no
    // verdict for it, and neither does the snippet.
    const { description } = meta([aCase("a", "शीर्षक", { type: "accused", outcome: "charged" })]);
    expect(description).toContain("अभियुक्त");
    expect(description).not.toMatch(/अभियोग|विचाराधीन|pending/i);
  });

  it.each([
    ["witness", "साक्षी"],
    ["victim", "पीडित"],
  ])("does not name a %s's role, nor pin someone else's case title to them", (role, label) => {
    const { description } = meta([
      aCase("a", "अर्को व्यक्तिविरुद्ध भ्रष्टाचार मुद्दा", { type: role }),
    ]);
    expect(description).not.toContain(label);
    // A title naming someone ELSE as accused, beside this person's name, reads
    // as an accusation of them.
    expect(description).not.toContain("अर्को व्यक्तिविरुद्ध");
    expect(description).toContain("1 मुद्दा");
  });

  it("leads with the case the page lists first: accused before newer non-accused", () => {
    const { description } = meta([
      aCase("new", "नयाँ साक्षी मुद्दा", { type: "witness" }, "2025-01-01"),
      aCase("old", "पुरानो अभियुक्त मुद्दा", { type: "accused", outcome: "convicted" }, "2019-01-01"),
    ]);
    expect(description).toContain("पुरानो अभियुक्त मुद्दा");
    expect(description).toContain("2 मुद्दाहरू");
  });

  it("keeps the verdict when a long name and a long title compete for the snippet", () => {
    const { description } = meta(
      [aCase("a", "क".repeat(200), { type: "accused", outcome: "acquitted" })],
      {
        names: {
          en: "Tripureshwar Conductor Udhyog/Rabin Nirman Sewa/Kunwar Construction JV",
          ne: "त्रिपुरेश्वर कण्डक्टर उद्योग/रविन निर्माण सेवा/कुँवर कन्स्ट्रक्सन जे.भी",
        },
      },
    );
    expect(description.length).toBeLessThanOrEqual(160);
    expect(description).toContain("सफाइ");
  });

  it("counts every citing case, not just the first page of them", () => {
    const { description } = meta([aCase("a", "t", { type: "accused" })], { caseCount: 23 });
    expect(description).toContain("23 मुद्दाहरू");
  });

  it("keeps a curated description, or the registry sentence, when no case cites the entity", () => {
    expect(meta([], { recordDescription: "काठमाडौं महानगरपालिकाको वडा" }).description).toBe(
      "काठमाडौं महानगरपालिकाको वडा",
    );
    expect(meta([]).description).toContain("in the Jawafdehi public entity registry");
  });
});

describe("entityJsonLd", () => {
  const base = {
    recordIri: IRI,
    canonicalUrl: `${IRI}/`,
    rawType: "Person",
    names: NAMES,
    alternateNames: [],
    description: "",
    imageUrl: null,
    identifiers: [],
    cases: [] as Case[],
  };

  it("asserts the schema.org node the page is about", () => {
    const ld = entityJsonLd(base);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": IRI,
      url: `${IRI}/`,
      name: "हरि बहादुर थापा",
      alternateName: ["Hari Bahadur Thapa"],
    });
  });

  it("drops the registry's own jawafdehi: subtypes, and never asserts nothing", () => {
    expect(entityJsonLd({ ...base, rawType: ["AdministrativeArea", "jawafdehi:Municipality"] })["@type"]).toBe(
      "AdministrativeArea",
    );
    expect(entityJsonLd({ ...base, rawType: ["Organization", "Corporation"] })["@type"]).toEqual([
      "Organization",
      "Corporation",
    ]);
    expect(entityJsonLd({ ...base, rawType: "jawafdehi:JudicialBody" })["@type"]).toBe("Thing");
  });

  it("links sameAs ONLY to a Wikidata identifier the record carries", () => {
    const ld = entityJsonLd({
      ...base,
      identifiers: [
        { "@type": "PropertyValue", propertyID: "wikidata", value: "Q14474324" },
        { "@type": "PropertyValue", propertyID: "cbs-local-unit-code", value: "11106" },
        { "@type": "PropertyValue", propertyID: "wikidata", value: "not-a-qid" },
      ],
    });
    expect(ld.sameAs).toEqual(["https://www.wikidata.org/wiki/Q14474324"]);
    expect(entityJsonLd(base)).not.toHaveProperty("sameAs");
  });

  it("points subjectOf at the cases, and says nothing about a role", () => {
    const ld = entityJsonLd({
      ...base,
      cases: [aCase("bara-road", "बाराको सडक", { type: "accused", outcome: "convicted" })],
    });
    expect(ld.subjectOf).toEqual([
      { "@type": "CreativeWork", name: "बाराको सडक", url: "https://jawafdehi.org/case/bara-road/" },
    ]);
    const text = JSON.stringify(ld);
    expect(text).not.toMatch(/accused|convicted|अभियुक्त/);
  });

  it("does not assert a jobTitle — the registry's roles span time", () => {
    expect(entityJsonLd(base)).not.toHaveProperty("jobTitle");
  });
});
