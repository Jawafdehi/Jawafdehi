// SPDX-License-Identifier: Hippocratic-3.0
import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import type { Case } from "@/types/jds";

import { bilingualName, composeEntityDescription, entityJsonLd, entityMeta } from "./entity-meta";

const LABELS: Record<string, string> = {
  "entityDetail.relationTypeAccused": "अभियुक्त",
  "entityDetail.relationTypeAlleged": "आरोपित",
  "entityDetail.relationTypeWitness": "साक्षी",
  "entityDetail.relationTypeVictim": "पीडित",
  "entityDetail.caseOne": "मुद्दा",
  "entityDetail.cases": "मुद्दाहरू",
};
const t = ((key: string) => LABELS[key] ?? key) as unknown as TFunction;

// Fictional people and bodies throughout, per the repo's fixture rule: never
// attach an accusation or a verdict to a real name, even in a test.
const IRI = "https://jawafdehi.org/entity/person/namuna-byakti";
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
      { nes_id: IRI, display_name: "नमुना व्यक्ति", type: bind.type, outcome: bind.outcome ?? null },
      { nes_id: OTHER, display_name: "अर्को व्यक्ति", type: "accused", outcome: "convicted" },
    ],
  } as unknown as Case;
}

const NAMES = { en: "Namuna Byakti", ne: "नमुना व्यक्ति" };

function meta(cases: Case[], extra: Partial<Parameters<typeof entityMeta>[0]> = {}) {
  return entityMeta({
    names: NAMES,
    fallbackName: "Namuna Byakti",
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
    expect(bilingualName(NAMES, "ne", "x")).toBe("नमुना व्यक्ति · Namuna Byakti");
    expect(bilingualName(NAMES, "en", "x")).toBe("Namuna Byakti · नमुना व्यक्ति");
  });

  it("does not repeat a name the record holds once, and falls back when it holds none", () => {
    expect(bilingualName({ en: "", ne: "रवि" }, "en", "x")).toBe("रवि");
    expect(bilingualName({ en: "Same", ne: "Same" }, "ne", "x")).toBe("Same");
    expect(bilingualName({ en: "", ne: "" }, "ne", "fallback")).toBe("fallback");
  });
});

describe("entityMeta", () => {
  it("titles the page in both scripts", () => {
    expect(meta([]).title).toBe("नमुना व्यक्ति · Namuna Byakti | Jawafdehi");
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
          en: "Namuna Nirman Sewa/Namuna Construction Company/Namuna Engineering Joint Venture",
          ne: "नमुना निर्माण सेवा/नमुना कन्स्ट्रक्सन कम्पनी/नमुना इन्जिनियरिङ संयुक्त उपक्रम",
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
      name: "नमुना व्यक्ति",
      alternateName: ["Namuna Byakti"],
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
        { "@type": "PropertyValue", propertyID: "wikidata", value: "Q999999999" },
        { "@type": "PropertyValue", propertyID: "cbs-local-unit-code", value: "11106" },
        { "@type": "PropertyValue", propertyID: "wikidata", value: "not-a-qid" },
      ],
    });
    expect(ld.sameAs).toEqual(["https://www.wikidata.org/wiki/Q999999999"]);
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


describe("composeEntityDescription", () => {
  // A conviction overturned on appeal: the status that must never be cut in
  // half, because its first half alone says the opposite of the truth.
  const STATUS = "अभियुक्त · विशेष अदालत: दोषी ठहर · सर्वोच्च अदालत: फैसला उल्टी";

  it("keeps the whole status and shortens the NAME when a long name competes", () => {
    const d = composeEntityDescription({
      name: "न".repeat(150),
      context: "संस्था · 1 मुद्दा",
      status: STATUS,
      caseTitle: "नमुना मुद्दा",
    });
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d).toContain(STATUS);
  });

  it("drops a status that cannot fit whole — never keeps half of one", () => {
    const longStatus = `${STATUS} · ${"थप ".repeat(50)}`;
    const d = composeEntityDescription({
      name: "नमुना व्यक्ति",
      context: "व्यक्ति · 1 मुद्दा",
      status: longStatus,
      caseTitle: "नमुना मुद्दा",
    });
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d).not.toContain("दोषी ठहर");
    // ...and with no status, no case title: the title alone is the accusation
    // without the outcome.
    expect(d).not.toContain("नमुना मुद्दा");
  });

  it.each(Array.from({ length: 40 }, (_, i) => i * 7))(
    "never shows part of the status (name length %i)",
    (n) => {
      const d = composeEntityDescription({
        name: "न".repeat(n) || "x",
        context: "व्यक्ति · 3 मुद्दाहरू",
        status: STATUS,
        caseTitle: "क".repeat(120),
      });
      expect(d.length).toBeLessThanOrEqual(160);
      // All or nothing: if any of it is there, all of it is.
      const has = d.includes("दोषी ठहर") || d.includes("फैसला उल्टी");
      if (has) expect(d).toContain(STATUS);
    },
  );

  it("prefers the page-language script over clipping a bilingual name", () => {
    const d = composeEntityDescription({
      name: `${"न".repeat(70)} · ${"N".repeat(70)}`,
      context: "संस्था · 1 मुद्दा",
      status: STATUS,
      caseTitle: null,
    });
    expect(d).toContain("न".repeat(70));
    expect(d).not.toContain("N".repeat(10));
  });
});
