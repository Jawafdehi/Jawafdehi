import { describe, it, expect } from "vitest";

import { fold, matchesRomanized, romanize } from "@/lib/devanagari-roman";

describe("romanize", () => {
  it("gives a consonant its inherent vowel, and lets a matra replace it", () => {
    expect(romanize("बढी")).toBe("badhii");
    expect(romanize("उजुरी")).toBe("ujurii");
    expect(romanize("विवरण")).toBe("wiwarana");
  });

  it("drops the inherent vowel on a halant", () => {
    // क्ष is the test: without halant handling it romanises with a stray `a`
    // in the middle and stops matching anything a reader types.
    expect(romanize("सङ्ख्या")).toBe("sangkhyaa");
    expect(romanize("प्रदेश")).toBe("pradesha");
  });

  it("carries anusvara and chandrabindu as an n", () => {
    expect(romanize("संख्या")).toBe("sankhyaa");
    expect(romanize("हुँदैन")).toBe("hundaina");
  });

  it("converts Devanagari digits", () => {
    expect(romanize("२०८१")).toBe("2081");
  });

  it("passes non-Devanagari through untouched", () => {
    // Captions mix scripts freely: "आ.व. 2081/82".
    expect(romanize("आ.व. 2081/82")).toBe("aa.wa. 2081/82");
  });
});

describe("fold", () => {
  it("drops aspirates, which nobody types", () => {
    expect(fold("badhii")).toBe("badi");
    expect(fold("bhaktapur")).toBe("baktapur");
  });

  it("collapses vowel length", () => {
    expect(fold("ujurii")).toBe("ujuri");
    expect(fold("aadhaar")).toBe("adar");
  });

  it("discards spacing and punctuation", () => {
    expect(fold("aa.wa. 2081/82")).toBe("awa208182");
  });
});

describe("matchesRomanized", () => {
  it("finds Nepali text from a Latin-keyboard query", () => {
    // The case that prompted this: typing the sound of बढी.
    expect(matchesRomanized("बढी उजुरी परेका १० स्थानीय तह", "badhi")).toBe(true);
    expect(matchesRomanized("बढी उजुरी परेका १० स्थानीय तह", "badi")).toBe(true);
    expect(matchesRomanized("बढी उजुरी परेका १० स्थानीय तह", "ujuri")).toBe(true);
  });

  it("still matches a Devanagari query literally", () => {
    expect(matchesRomanized("बढी उजुरी परेका", "उजुरी")).toBe(true);
  });

  it("still matches an English caption in English", () => {
    expect(matchesRomanized("Annual report summary", "annual")).toBe(true);
  });

  it("does not match something unrelated", () => {
    expect(matchesRomanized("बढी उजुरी परेका", "kathmandu")).toBe(false);
    expect(matchesRomanized("Annual report", "zzz")).toBe(false);
  });

  it("treats an empty query as matching everything", () => {
    // The filter shows the whole list before anyone types.
    expect(matchesRomanized("anything", "   ")).toBe(true);
  });

  it("does not match a query that folds away to nothing", () => {
    // "..." folds to "" — without the guard, every row would match it.
    expect(matchesRomanized("बढी", "...")).toBe(false);
  });
});
