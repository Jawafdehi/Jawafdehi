import { describe, expect, it } from "vitest";

import {
  buildEvidenceRow,
  courtOf,
  evidenceActions,
  evidenceGroup,
  evidenceOrigin,
  formatBsDate,
  parseBsDate,
  sortByDate,
  splitTitleDate,
  withheldState,
} from "@/lib/evidence-sources";
import type { EvidenceEntry, SourceLink } from "@/types/jds";

const OUR = "https://s3.jawafdehi.org/case_uploads/";

describe("evidenceGroup", () => {
  it("groups by the material's source bucket", () => {
    expect(evidenceGroup("court_order")).toBe("court");
    expect(evidenceGroup("charge_sheet")).toBe("charge");
    expect(evidenceGroup("ciaa_press_release")).toBe("charge");
    expect(evidenceGroup("news")).toBe("news");
    expect(evidenceGroup("social_media")).toBe("social");
    expect(evidenceGroup("legal_corpus")).toBe("law");
    expect(evidenceGroup("document")).toBe("document");
    expect(evidenceGroup(null)).toBe("document");
  });

  it("lets the archive's court classification move a ruling filed as a document", () => {
    expect(evidenceGroup("document", "COURT_FILING_OTHER")).toBe("court");
  });
});

describe("dates", () => {
  it.each([
    ["2081-08-11", { year: 2081, month: 8, day: 11, approximate: false }],
    ["२०८२-०९-३०", { year: 2082, month: 9, day: 30, approximate: false }],
    ["2080 Poush 9", { year: 2080, month: 9, day: 9, approximate: false }],
    ["2082 Asar", { year: 2082, month: 3, day: 0, approximate: false }],
    ["२०७८ वैशाख ५", { year: 2078, month: 1, day: 5, approximate: false }],
    ["n.d., circa 2078 B.S.", { year: 2078, month: 0, day: 0, approximate: true }],
  ])("parses %s", (input, expected) => {
    expect(parseBsDate(input)).toEqual(expected);
  });

  it("does not take an AD date for a BS one", () => {
    expect(parseBsDate("January 23, 2024")).toBeNull();
    expect(parseBsDate("2024-01-23")).toBeNull();
  });

  it("splits a trailing date off a title, and leaves other brackets alone", () => {
    expect(splitTitleDate("Gorkha Media Pvt. Ltd Shareholders (2078 Asoj 23)")).toEqual({
      title: "Gorkha Media Pvt. Ltd Shareholders",
      date: { year: 2078, month: 6, day: 23, approximate: false },
    });
    expect(splitTitleDate("Tulsipur HC (Butwal) grants bail (082-RE-0156)").date).toBeNull();
  });

  it("formats in Nepali numerals on the Nepali page", () => {
    const d = { year: 2081, month: 8, day: 11, approximate: false };
    expect(formatBsDate(d, "ne")).toBe("२०८१ मंसिर ११");
    expect(formatBsDate(d, "en")).toBe("2081 Mangsir 11");
    expect(formatBsDate({ year: 2079, month: 0, day: 0, approximate: true }, "ne")).toBe("करिब २०७९");
  });
});

describe("evidenceActions", () => {
  it("puts the redacted PDF first and the transcript second, never 'PDF copy 2'", () => {
    const actions = evidenceActions({
      display_name: "x",
      material_type: "document",
      urls: [
        { link: `${OUR}a.md`, role: "REDACTED_MARKDOWN" },
        { link: `${OUR}b.pdf`, role: "REDACTED_PDF" },
      ] as unknown as SourceLink[],
    });
    expect(actions.map((a) => [a.kind, a.redacted])).toEqual([
      ["pdf", true],
      ["text", true],
    ]);
  });

  it("never shows a staff-only original when a redacted copy exists", () => {
    const actions = evidenceActions({
      display_name: "x",
      material_type: "ag",
      urls: [
        { link: `${OUR}orig.pdf`, role: "RAW" },
        { link: `${OUR}red.pdf`, role: "REDACTED_PDF" },
        { link: `${OUR}orig.md`, role: "MARKDOWN" },
        { link: `${OUR}red.md`, role: "REDACTED_MARKDOWN" },
      ] as unknown as SourceLink[],
    });
    const hrefs = actions.map((a) => a.href);
    expect(hrefs).not.toContain(`${OUR}orig.pdf`);
    expect(hrefs).not.toContain(`${OUR}orig.md`);
    expect(hrefs).toEqual([`${OUR}red.pdf`, `${OUR}red.md`]);
  });

  it("keeps the original page, files and archive snapshots, and drops non-http links", () => {
    const actions = evidenceActions({
      display_name: "x",
      material_type: "news",
      urls: [
        { link: "https://ekantipur.com/news/1", role: "SOURCE_PAGE" },
        { link: "https://web.archive.org/web/2024/https://ekantipur.com/news/1", role: "RAW" },
        { link: "https://ag.gov.np/a.docx", role: "ALTERNATE" },
        { link: "javascript:alert(1)", role: "RAW" },
      ] as unknown as SourceLink[],
    });
    expect(actions.map((a) => a.kind)).toEqual(["source", "archive", "file"]);
  });
});

describe("withheldState", () => {
  it("says nothing is public yet when the API flags the original and nothing is out", () => {
    expect(
      withheldState({ display_name: "x", material_type: "document", urls: [], withheld: { pdf: true, transcript: false } }, []),
    ).toBe("all");
  });

  it("says only the PDF is pending when the transcript is out", () => {
    expect(
      withheldState({ display_name: "x", material_type: "document", urls: [], withheld: { pdf: true, transcript: false } }, [
        { kind: "text", href: `${OUR}a.md`, redacted: true },
      ]),
    ).toBe("pdf");
  });

  it("does not guess when the API does not say", () => {
    expect(withheldState({ display_name: "x", material_type: "document", urls: [] }, [])).toBe("none");
  });
});

describe("origin", () => {
  it("names the court from the IRI, the API, or the title", () => {
    expect(courtOf("https://jawafdehi.org/material/court_order/special.076-cr-0438", "")).toBe("special");
    expect(courtOf("https://jawafdehi.org/material/court_order/20260103.ab", "", "patanhc")).toBe("patanhc");
    expect(courtOf("https://jawafdehi.org/material/court_order/20260103.ab", "Supreme court order 081-WH-0320")).toBe("supreme");
    expect(courtOf("https://jawafdehi.org/material/court_order/20260103.ab", "Rupandehi District Court order 081-C1-0533")).toBe(
      "rupandehidc",
    );
    expect(courtOf("https://jawafdehi.org/material/court_order/20260103.ab", "Patan High Court refuses bail")).toBe("patanhc");
  });

  it("gives court records a court chip", () => {
    const origin = evidenceOrigin({
      group: "court",
      materialIri: "https://jawafdehi.org/material/court_order/supreme.081-wh-0320",
      title: "",
      links: [],
    });
    expect(origin).toMatchObject({
      kind: "court",
      label: "Supreme Court",
      labelNe: "सर्वोच्च अदालत",
      logo: "/source-logos/nepal-judiciary.png",
    });
  });

  it("gives police documents a police chip with the issuing office", () => {
    const base = { materialIri: "https://jawafdehi.org/material/court_order/20260103.ab", links: [] };
    expect(
      evidenceOrigin({
        ...base,
        group: "court",
        title: "Rabi Lamichhane Arrest Warrant in Kathmandu (2081 Chaitra 22)",
        description: "District Police Kathmandu (जिल्ला प्रहरी परिसर, काठमाडौं) and Kathmandu Valley Police Office",
      }),
    ).toMatchObject({ kind: "police", labelNe: "जिल्ला प्रहरी परिसर, काठमाडौं" });
    expect(
      evidenceOrigin({
        ...base,
        group: "document",
        title: "Rabi Lamichhane Arrest Warrant in Rupandehi",
        description: "District Police, Rupandehi issue arrest warrant for Rabi Lamichhane.",
      }),
    ).toMatchObject({ kind: "police", label: "District Police Office, Rupandehi", labelNe: "जिल्ला प्रहरी कार्यालय, रूपन्देही" });
    expect(
      evidenceOrigin({ ...base, group: "document", title: "CIB press release on cooperative fraud arrests" }),
    ).toMatchObject({ kind: "police", labelNe: "केन्द्रीय अनुसन्धान ब्यूरो" });
    expect(
      evidenceOrigin({ ...base, group: "charge", title: "Press release", materialType: "nepal_police" }),
    ).toMatchObject({ kind: "police", labelNe: "नेपाल प्रहरी" });
  });

  it("keeps a court's own order as a court, even when it mentions the police", () => {
    expect(
      evidenceOrigin({
        group: "court",
        materialIri: "https://jawafdehi.org/material/court_order/20260103.ab",
        title: "Rupandehi District Court order 081-C1-0533",
        links: [],
        description: "Orders the District Police to release Lamichhane on bail.",
      }),
    ).toMatchObject({ kind: "court", labelNe: "जिल्ला अदालत रूपन्देही" });
  });

  it("names the outlet from a URL in the description, with its logo and link", () => {
    const origin = evidenceOrigin({
      group: "news",
      materialIri: "https://jawafdehi.org/material/news/1",
      title: "Report of the Forensic Test",
      links: [],
      description: "Source: https://ekantipur.com/news/2025/01/09/en/forensic.html",
    });
    expect(origin).toMatchObject({
      kind: "outlet",
      label: "Kantipur",
      logo: "/source-logos/ekantipur.com.png",
      href: "https://ekantipur.com/news/2025/01/09/en/forensic.html",
    });
  });

  it("uses the same URL trimming as the links (danda, balanced brackets)", () => {
    expect(
      evidenceOrigin({
        group: "news",
        materialIri: "",
        title: "",
        links: [],
        description: "स्रोत: https://ekantipur.com/news/article.html।",
      }),
    ).toMatchObject({ href: "https://ekantipur.com/news/article.html" });
    expect(
      evidenceOrigin({
        group: "document",
        materialIri: "",
        title: "",
        links: [],
        description: "Source: https://en.wikipedia.org/wiki/Rabi_Lamichhane_(politician)",
      }),
    ).toMatchObject({ href: "https://en.wikipedia.org/wiki/Rabi_Lamichhane_(politician)" });
  });

  it("names the platform and the account for social posts", () => {
    const origin = evidenceOrigin({
      group: "social",
      materialIri: "https://jawafdehi.org/material/social_media/1",
      title: "",
      links: [],
      description: "Source: Rabi Lamichhane Twitter (https://x.com/hamrorabi/status/1749489567135338894/)",
    });
    expect(origin).toMatchObject({ kind: "platform", label: "X", account: "Rabi Lamichhane" });
  });

  it("falls back to the host, then to the named source", () => {
    expect(
      evidenceOrigin({ group: "document", materialIri: "", title: "", links: [], description: "Source: https://www.ciaa.gov.np/x" }),
    ).toMatchObject({ kind: "web", label: "ciaa.gov.np" });
    expect(evidenceOrigin({ group: "document", materialIri: "", title: "", links: [], description: "Source: RSP" })).toMatchObject({
      kind: "web",
      label: "RSP",
    });
    expect(evidenceOrigin({ group: "document", materialIri: "", title: "", links: [] })).toBeNull();
  });

  it("ignores links to our own site", () => {
    expect(
      evidenceOrigin({
        group: "document",
        materialIri: "",
        title: "",
        links: [{ link: "https://jawafdehi.org/material/document/1", role: "SOURCE_PAGE" }],
      }),
    ).toBeNull();
  });
});

describe("buildEvidenceRow", () => {
  const entry = (over: Partial<EvidenceEntry["material"]> & { details?: string; iri?: string }): EvidenceEntry => ({
    material_iri: over.iri ?? "https://jawafdehi.org/material/document/1",
    additional_details: over.details ?? ".",
    material: { display_name: "A title", material_type: "document", urls: [], ...over },
  });

  it("drops the '.' placeholder and takes the date from the API before the title", () => {
    const row = buildEvidenceRow(entry({ display_name: "Shareholders (2080 Baisakh 4)", date: "2081-01-02" }), 0);
    expect(row.title).toBe("Shareholders");
    expect(row.date).toMatchObject({ year: 2081, month: 1, day: 2 });
    expect(row.details).toEqual([]);
  });

  it("uses a note that is only a date as the date", () => {
    const row = buildEvidenceRow(entry({ details: "२०७८ वैशाख ५" }), 0);
    expect(row.date).toMatchObject({ year: 2078, month: 1, day: 5 });
    expect(row.details).toEqual([]);
  });

  it("converts an AD date from the API", () => {
    const row = buildEvidenceRow(entry({ date_ad: "2024-01-23" }), 0);
    expect(row.date).toMatchObject({ year: 2080, month: 10, day: 9 });
  });

  it("keeps real details and drops the 'Source:' line the chip already shows", () => {
    const row = buildEvidenceRow(
      entry({ description: "Source: Kantipur News", details: "Full report dated 2081 Bhadra 30." }),
      0,
    );
    expect(row.origin).toMatchObject({ label: "Kantipur" });
    expect(row.details).toEqual(["Full report dated 2081 Bhadra 30."]);
  });

  it("joins multi-line descriptions", () => {
    const row = buildEvidenceRow(
      entry({ material_type: "court_order", description: "Cases: 081-RE-0313\r\n\r\nJudges: रमेश ढकाल" }),
      0,
    );
    expect(row.details).toEqual(["Cases: 081-RE-0313 · Judges: रमेश ढकाल"]);
  });

  it("sorts undated rows last, keeping case order otherwise", () => {
    const rows = [
      buildEvidenceRow(entry({ display_name: "c" }), 0),
      buildEvidenceRow(entry({ display_name: "b (2081 Magh 1)" }), 1),
      buildEvidenceRow(entry({ display_name: "a (2080 Magh 1)" }), 2),
    ];
    expect(sortByDate(rows).map((r) => r.title)).toEqual(["a", "b", "c"]);
  });
});
