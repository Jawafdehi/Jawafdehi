import { describe, it, expect } from "vitest";

import { captionOr, isCaptionFragment } from "./content-captions";

// Every string here is a real caption pulled from the production content plane for
// the CIAA annual-report shelf, not an invention. The upstream extractor takes the
// text immediately before a table and keeps its end, which is why so many of them
// are the tail of the preceding sentence.

const FRAGMENTS = [
  "छ।",
  "दायर गरिएको छ।",
  "आरोपपत्र दायर गरिएको छ।",
  "पत्र दायर गरिएको।",
  "मिति २०७३।११।५ मा विशेष अदालत काठमाडौंमा आरोप पत्र दायर गरिएको।",
  "बमोजिम सजाय मागदाबी लिइएको छ।",
  "राखिएको छ:-",
  "देहायबमोजिम रहेको छ:-",
  "कर्मचारीहरूको संख्या देहायबमोजिम रहेको छ:-",
  "बैठकहरू यसप्रकार रहेका छन्:",
  "मुद्दाहरू आ.व. ०७३/७४ मा विशेष अदालतमा दायर गरिएका छन्:",
  "B.",
];

const CELL_VALUES = ["४५००", "१४०००", "८००० ७२६४", "७१२,४८२।५६", "-६-", ",", "३."];

const TITLES = [
  "तालिका २.१ उजुरीको संख्या",
  "तालिका २.३ प्रारम्भिक छानबिनबाट फर्छ्यौट भएका उजुरीको संख्या",
  "तालिका २.४ विस्तृत अनुसन्धानबाट भएको कारबाहीको विवरण:",
  "अख्तियार दुरुपयोग अनुसन्धान आयोगको स्वीकृत दरबन्दी अनुसूची २ (क)",
  "आ.व २०७३।७४ सालको बजेट व्यवस्था",
  "५ वर्षको कुल उजुरी फर्छ्यौटको प्रवृत्ति",
  "मन्त्रालय/निकायगत विवरण",
  "७.३.३.१ अन्तर्क्रिया कार्यक्रमहरूको विवरण",
];

/** Single generic words that ARE legitimate Nepali table headings. The length floor
 *  is set to keep these; a stricter one would discard real captions. */
const SHORT_BUT_REAL = ["तपसिल", "संकेत", "विवरण", "निकाय"];

describe("isCaptionFragment", () => {
  it.each(FRAGMENTS)("treats a sentence tail as absent: %s", (caption) => {
    expect(isCaptionFragment(caption)).toBe(true);
  });

  it.each(CELL_VALUES)("treats a bare cell value as absent: %s", (caption) => {
    expect(isCaptionFragment(caption)).toBe(true);
  });

  it.each(TITLES)("keeps a real title: %s", (caption) => {
    expect(isCaptionFragment(caption)).toBe(false);
  });

  it.each(SHORT_BUT_REAL)("keeps a short but genuine heading: %s", (caption) => {
    expect(isCaptionFragment(caption)).toBe(false);
  });

  it("treats empty, whitespace and nullish alike", () => {
    for (const value of ["", "   ", null, undefined]) {
      expect(isCaptionFragment(value)).toBe(true);
    }
  });

  it("tests the danda at the END, so a date separator inside a title is fine", () => {
    // `२०७३।७४` is a fiscal year written with a danda. Testing "contains" rather
    // than "ends with" would discard this real caption.
    expect(isCaptionFragment("आ.व २०७३।७४ सालको बजेट व्यवस्था")).toBe(false);
    expect(isCaptionFragment("आ.व २०७३।७४ सालको बजेट रहेको छ।")).toBe(true);
  });
});

describe("captionOr", () => {
  it("falls back for a fragment, rather than rendering the fragment", () => {
    // 🛑 The regression this exists for: `caption.trim() || …` rendered table rows
    // titled `छ।`, which means "is." and tells a reader nothing.
    expect(captionOr("छ।", "Table 30")).toBe("Table 30");
    expect(captionOr("देहायबमोजिम रहेको छ:-", "Table 30")).toBe("Table 30");
  });

  it("still falls back when the caption is empty or nullish upstream", () => {
    expect(captionOr("", "Table 30")).toBe("Table 30");
    expect(captionOr(null, "Untitled chart")).toBe("Untitled chart");
  });

  it("uses a real title, trimmed", () => {
    expect(captionOr("  तालिका २.१ उजुरीको संख्या  ", "Table 30")).toBe(
      "तालिका २.१ उजुरीको संख्या",
    );
  });
});
