// DEV ONLY — the case page under realistic extremes (/case/<slug>?data=worst).
//
// The case page is designed against one well-kept case. This swaps the REAL API
// response at the data boundary for the shapes the archive actually holds at its
// edges, so every block of the page (the banner, the facts card and its stage
// rail, the allegations) is checked as it renders production data:
//
//   worst   everything at its longest: a 200-character Nepali title, a dozen
//           tags, a बिगो in the hundreds of arab, four long place names, five
//           stages (investigation → first instance → appeal → review → other)
//           with notes, four court files, three contributors, eight allegations
//   sparse  a case with nothing but a title: no deck, tags, amount, places,
//           stages, court files, authors, allegations or picture
//   one     a single, still-pending first-instance stage (the lone-marker case)
//
// Imported only behind `import.meta.env.DEV`, so it never reaches a production
// bundle.
import type { CaseDetail, CaseStage, JawafEntity } from "@/types/jds";

export type CaseStressMode = "worst" | "sparse" | "one";

const LONG_TITLE =
  "नक्कली शैक्षिक प्रमाणपत्र पेश गरी शिक्षक नियुक्ति लिई राज्यकोषबाट तलबभत्ता बुझेको: सप्तरीको श्री जनता माध्यमिक विद्यालय, राजविराज नगरपालिका–७ का प्रधानाध्यापकसहित ११ जनाविरुद्ध भ्रष्टाचार मुद्दा (080-CR-0417)";

const place = (name: string): JawafEntity => ({ nes_id: null, display_name: name, type: "location" });

const STAGES_WORST: CaseStage[] = [
  { stage: "investigation", start: "2019-03-14", end: "2020-11-02", body: "अख्तियार दुरुपयोग अनुसन्धान आयोग" },
  { stage: "initial", start: "2020-11-03", end: "2023-06-21", courtcase_iri: "https://jawafdehi.org/courtcase/special/077-CR-0112" },
  { stage: "appeal", start: "2023-09-10", end: "2025-02-17", courtcase_iri: "https://jawafdehi.org/courtcase/supreme/080-RC-0091" },
  {
    stage: "review",
    start: "2025-05-02",
    end: null,
    courtcase_iri: "https://jawafdehi.org/courtcase/supreme/081-RV-0007",
    notes: "पुनरावलोकनको निवेदन दर्ता भई पेशी तोकिन बाँकी; सर्वोच्च अदालतको संयुक्त इजलासमा सुनुवाइ हुने।",
  },
  { stage: "other", label: "Asset recovery", start: "2025-08-01", end: null, body: "महान्यायाधिवक्ताको कार्यालय" },
];

export function applyCaseStress(mode: CaseStressMode, real: CaseDetail): CaseDetail {
  if (mode === "one") {
    return {
      ...real,
      dates: { stages: [{ stage: "initial", start: "2025-06-05", end: null, courtcase_iri: "https://jawafdehi.org/courtcase/special/081-CR-0107" }] },
    };
  }

  if (mode === "sparse") {
    return {
      ...real,
      short_description: null,
      tags: [],
      bigo: null,
      entities: real.entities.filter((entity) => entity.type !== "location"),
      dates: { stages: [] },
      court_cases: [],
      authors: [],
      public_notes: "",
      case_publish_date: null,
      public_edit_history: [],
      key_allegations: [],
      missing_details: null,
      banner: null,
      banner_url: null,
      thumbnail_url: null,
    } as CaseDetail;
  }

  return {
    ...real,
    title: LONG_TITLE,
    short_description:
      "शिक्षक सेवा आयोगको नाममा बनाइएको नक्कली अनुमतिपत्र र त्रिभुवन विश्वविद्यालयको नक्कली स्नातक प्रमाणपत्रका आधारमा सात वर्षसम्म तलबभत्ता र सञ्चय कोष रकम बुझेको आरोप।",
    tags: [
      "नक्कली प्रमाणपत्र",
      "शिक्षक नियुक्ति",
      "Fake certificate",
      "Abuse of authority",
      "Province 2",
      "Saptari",
      "Teachers' Service Commission",
      "Tribhuvan University",
      "Public funds",
      "Salary fraud",
      "Long-running case",
      "Supreme Court review",
    ],
    bigo: 487_365_000_000,
    entities: [
      ...real.entities.filter((entity) => entity.type !== "location"),
      place("Rajbiraj Municipality, Ward 7, Saptari District"),
      place("सप्तरी जिल्ला"),
      place("Madhesh Province (Province No. 2)"),
      place("Kathmandu Metropolitan City, Ward 31 (New Baneshwor)"),
    ],
    dates: { stages: STAGES_WORST },
    court_cases: [
      "https://jawafdehi.org/courtcase/special/077-CR-0112",
      "https://jawafdehi.org/courtcase/supreme/080-RC-0091",
      "https://jawafdehi.org/courtcase/supreme/081-RV-0007",
      "https://jawafdehi.org/courtcase/special/081-CR-0233",
    ],
    authors: [
      { slug: "a", display_name: "Kumari Laxmi Rajya Lakshmi Devi Shah", title: "Senior caseworker and BALLB 4th year student", has_public_page: false },
      { slug: "b", display_name: "Niroj Aryal", title: "Caseworker", has_public_page: false },
      { slug: "c", display_name: "Bishwratna Shakya", title: "Volunteer reviewer", has_public_page: false },
    ],
    key_allegations: Array.from({ length: 8 }, (_, index) =>
      index % 2
        ? "प्रधानाध्यापकले शिक्षक सेवा आयोगको नाममा बनाइएको नक्कली अनुमतिपत्र पेश गरी सात वर्षसम्म राज्यकोषबाट तलबभत्ता, चाडपर्व खर्च र सञ्चय कोष रकम बुझेको, जसले सार्वजनिक सम्पत्तिको हानिनोक्सानी गरेको।"
        : "Submitted a forged Tribhuvan University bachelor's certificate to secure promotion to head teacher, then signed off the appointments of ten further teachers on the same forged documents.",
    ),
  } as CaseDetail;
}
