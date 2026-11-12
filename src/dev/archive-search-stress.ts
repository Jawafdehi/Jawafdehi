// DEV ONLY — worst-case data for the archive search page (/search?data=worst).
//
// The page is designed against kind data: two-word names, one-line titles,
// counts that need no separator, every optional field filled. This swaps the
// REAL API response for the realistic worst case at the data boundary (the
// search response), so the components are tested exactly as they render
// production data. Every value is something the archive actually holds or
// plausibly will: long Nepali office names, cases with a dozen tags, a बिगो in
// the hundreds of arab, a court case with no parties indexed.
//
// Imported only behind `import.meta.env.DEV`, so it never reaches a production
// bundle. Keep it: it is the regression test for the next change to the cards.
import type {
  ArchiveSearchFacets,
  ArchiveSearchResponse,
  ArchiveSearchResult,
} from "@/types/search";

export type StressMode = "worst" | "empty" | "one";

export const STRESS_MODES: ReadonlyArray<{ value: StressMode | "demo"; label: string }> = [
  { value: "demo", label: "Demo data" },
  { value: "worst", label: "Worst case" },
  { value: "empty", label: "Empty" },
  { value: "one", label: "One" },
];


const LONG_OFFICE_EN =
  "Department of Urban Development and Building Construction, Kathmandu Valley Division Office (Provincial Coordination Unit)";
const LONG_OFFICE_NE =
  "सहरी विकास तथा भवन निर्माण विभाग, काठमाडौं उपत्यका डिभिजन कार्यालय (प्रदेश समन्वय इकाई)";
const LONG_PERSON_EN = "Kumari Laxmi Rajya Lakshmi Devi Shah Thakuri Bhandari";
const LONG_PERSON_NE = "कुमारी लक्ष्मी राज्यलक्ष्मी देवी शाह ठकुरी भण्डारी";
const LONG_CASE_TITLE =
  "नक्कली शैक्षिक प्रमाणपत्र पेश गरी शिक्षक नियुक्ति लिई राज्यकोषबाट तलबभत्ता बुझेको: सप्तरीको श्री जनता माध्यमिक विद्यालय, राजविराज नगरपालिका–७ का प्रधानाध्यापकसहित ११ जनाविरुद्ध भ्रष्टाचार मुद्दा (080-CR-0417)";
const UNBREAKABLE =
  "https://ppmo.gov.np/notices/2081-82/procurement/e-bidding/NCB-DUDBC-KTM-2081-82-Package-17-Lot-3-amendment-02.pdf";

const MANY_TAGS = [
  "भ्रष्टाचार",
  "नक्कली प्रमाणपत्र",
  "सार्वजनिक खरिद ऐन २०६३ को दफा ४८ को उल्लङ्घन",
  "राजस्व चुहावट",
  "घूस",
  "procurement",
  "education",
  "सप्तरी",
  "विशेष अदालत",
  "बिगो असुली",
  "अख्तियार दुरुपयोग",
  "2080",
];

// 4000×200, inline so the fixture needs no network.
const PANORAMA =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="200"><defs><linearGradient id="g"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs><rect width="4000" height="200" fill="url(#g)"/></svg>',
  );

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Mix the failures across the first rows of each type, as real data does. */
function stressResult(result: ArchiveSearchResult, index: number): ArchiveSearchResult {
  const r = clone(result);
  const slot = index % 6;

  if (r.type === "entity") {
    if (slot === 0) {
      r.title = { en: LONG_OFFICE_EN, ne: LONG_OFFICE_NE };
      r.extra = { ...r.extra, type: "Organization,GovernmentOrganization" };
    } else if (slot === 1) {
      // Two letters; a name column left nearly empty.
      r.title = { en: "Jo", ne: null };
      r.extra = { ...r.extra, type: "Person" };
    } else if (slot === 2) {
      // Nepali only, no English name at all.
      r.title = { en: null, ne: LONG_PERSON_NE };
      r.extra = { ...r.extra, type: "Person" };
    } else if (slot === 3) {
      r.title = { en: LONG_PERSON_EN, ne: LONG_PERSON_NE };
      // A picture URL that 404s: the avatar must fall back to the glyph.
      r.extra = { ...r.extra, type: "Person", image: "https://example.com/missing/portrait.jpg" };
    } else if (slot === 4) {
      // A 4000×200 panorama as a portrait.
      r.title = { en: "Rabi Lamichhane", ne: "रवि लामिछाने" };
      r.extra = {
        ...r.extra,
        type: "Person",
        image: PANORAMA,
      };
    } else {
      // A subtype the label map has no entry for, and an unbreakable name.
      r.title = { en: UNBREAKABLE, ne: null };
      r.extra = { ...r.extra, type: "AdministrativeArea,jawafdehi:SubMetropolitanCity" };
    }
    return r;
  }

  if (r.type === "case" && r.card) {
    if (slot === 0) {
      r.card.title = LONG_CASE_TITLE;
      r.title = { en: null, ne: LONG_CASE_TITLE };
      r.card.tags = MANY_TAGS;
      r.card.bigo = 987_654_321_012; // 98,765 crore
    } else if (slot === 1) {
      // One word.
      r.card.title = "ठगी";
      r.title = { en: null, ne: "ठगी" };
      r.card.tags = [];
      r.card.bigo = null;
      r.card.entities = [];
    } else if (slot === 2) {
      // No image anywhere: the placeholder path.
      r.card.thumbnail = null;
      r.card.thumbnail_url = null;
      r.card.banner_url = null;
      r.card.tags = ["सार्वजनिक खरिद ऐन २०६३ को दफा ४८ को उल्लङ्घन"];
    } else if (slot === 3) {
      // Thirty accused, one of them an office with a long name.
      const first = r.card.entities[0];
      if (first) {
        r.card.entities = Array.from({ length: 30 }, (_, i) => ({
          ...first,
          nes_id: null,
          display_name: i === 0 ? LONG_OFFICE_NE : `${LONG_PERSON_NE} ${i}`,
        }));
      }
      r.card.bigo = 1;
    } else if (slot === 4) {
      r.card.title = "Budhigandaki Hydropower Project: Allegation of 9 Billion NPR Corruption in Land Acquisition and Resettlement Compensation";
      r.title = { en: r.card.title, ne: null };
    }
    return r;
  }

  if (r.type === "material") {
    if (slot === 0) {
      r.title = { en: null, ne: LONG_CASE_TITLE };
      r.snippet = {
        ne: `${"<em>भ्रष्टाचार</em> ".repeat(3)}${LONG_CASE_TITLE} ${LONG_OFFICE_NE} ${LONG_CASE_TITLE}`,
        en: null,
      };
    } else if (slot === 1) {
      r.title = { en: UNBREAKABLE, ne: null };
    } else if (slot === 2) {
      // Undated, untitled, unknown source.
      r.title = { en: null, ne: null };
      r.extra = { type: "DigitalDocument" };
      r.url = "/material/unknown-source-xyz/1";
    } else if (slot === 3) {
      // Bikram Sambat year stored in the AD field (the 2082-* quirk).
      r.extra = { ...r.extra, date: "2082-01-15" };
    }
    return r;
  }

  if (r.type === "courtcase") {
    if (slot === 0) {
      r.extra = {
        ...r.extra,
        parties: {
          defendant: { names: [LONG_PERSON_NE, "रामबहादुर थापा"], total: 47 },
          plaintiff: { names: ["नेपाल सरकार"], total: 1 },
        },
        case_status: "फैसला / अन्तिम आदेश >> अभियोग दाबी आंशिक पुग्ने ठहर भई बाँकी प्रतिवादीहरूको हकमा तामेलीमा राखिएको",
      };
    } else if (slot === 1) {
      // Indexed before parties existed.
      const extra = { ...r.extra };
      delete extra.parties;
      delete extra.case_status;
      r.extra = extra;
    } else if (slot === 2) {
      r.title = { en: null, ne: LONG_CASE_TITLE };
      r.extra = { ...r.extra, court: "unknowncourt", court_type: undefined };
    }
    return r;
  }

  return r;
}

function stressFacets(facets: ArchiveSearchFacets): ArchiveSearchFacets {
  const f = clone(facets);
  // Counts that need separators, a zero, and a label nobody translated.
  const longTail = (name: string, count: number) => ({ name, count });
  for (const key of Object.keys(f) as Array<keyof ArchiveSearchFacets>) {
    const list = f[key];
    if (!list?.length) continue;
    list[0] = { ...list[0], count: 12_345_678 };
    list.push(longTail("सार्वजनिक खरिद ऐन २०६३ को दफा ४८ को उल्लङ्घन सम्बन्धी मुद्दा", 0));
  }
  return f;
}

export function applyStress(
  mode: StressMode,
  response: ArchiveSearchResponse,
): ArchiveSearchResponse {
  const r = clone(response);
  if (mode === "empty") {
    return { ...r, count: 0, results: [], counts: {}, facets: r.facets };
  }
  if (mode === "one") {
    return { ...r, count: 1, results: r.results.slice(0, 1) };
  }
  return {
    ...r,
    count: 9_876_543,
    results: r.results.map(stressResult),
    facets: stressFacets(r.facets),
  };
}
