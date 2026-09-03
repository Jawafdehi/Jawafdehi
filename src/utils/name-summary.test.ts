import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";

import { normalizeLanguage, summarizeNames, toNepaliDigits } from "@/utils/name-summary";

// Stands in for i18next. It renders the key and the interpolation values rather
// than a sentence, so every assertion below pins down WHICH key was asked for
// and WHAT values were passed — the decisions this module actually makes —
// instead of the wording of a locale resource that translators may reword.
//
// Both `count` and `countLabel` are asserted on every call on purpose: en.json
// interpolates `{{count}}` and ne.json interpolates `{{countLabel}}`, so
// dropping either one silently breaks exactly one language.
const t = ((key: string, options?: Record<string, unknown>) =>
  `${key}|name=${options?.name}|count=${options?.count}|countLabel=${options?.countLabel}`) as unknown as TFunction;

describe("normalizeLanguage", () => {
  it("defaults to Nepali, the language the app is about to resolve to", () => {
    // i18next types `language` as string but leaves it undefined before init
    // and in tests; an unguarded `.startsWith` on it once crashed every card on
    // the search page. The default is `ne` because config.ts sets both `lng`
    // and `fallbackLng` to `ne` — defaulting to `en` briefly showed English
    // court names and AD dates to a Nepali reader.
    expect(normalizeLanguage(undefined)).toBe("ne");
    expect(normalizeLanguage(null)).toBe("ne");
    expect(normalizeLanguage("en")).toBe("en");
    expect(normalizeLanguage("ne-NP")).toBe("ne-NP");
  });
});

describe("toNepaliDigits", () => {
  it("maps every digit, not just the first", () => {
    expect(toNepaliDigits(3)).toBe("३");
    expect(toNepaliDigits(12)).toBe("१२");
    expect(toNepaliDigits(2083)).toBe("२०८३");
  });
});

describe("summarizeNames", () => {
  it("returns a lone name with no count attached", () => {
    expect(summarizeNames({ names: ["राम बहादुर"] }, { t })).toBe("राम बहादुर");
  });

  it("names the first party and counts the rest, in both digit systems at once", () => {
    // One key, both representations. The locale file picks; this module does
    // not branch on language, so there is no way to ask for the English
    // sentence while the Nepali bundle is active.
    expect(summarizeNames({ names: ["राम", "श्याम", "हरि"] }, { t })).toBe(
      "common.nameSummary.withOthers|name=राम|count=2|countLabel=२",
    );
  });

  it("counts from the uncapped total, not from the names it was given", () => {
    // This is the whole reason the API sends `total` separately: it caps
    // `names` at PARTY_NAME_CAP (5), so counting the array would report "with 4
    // others" on a case with nine parties and stop being true at the cap.
    expect(summarizeNames({ names: ["A", "B", "C", "D", "E"], total: 9 }, { t })).toBe(
      "common.nameSummary.withOthers|name=A|count=8|countLabel=८",
    );
  });

  it("never claims fewer parties than the names already on screen", () => {
    // A stale or wrong `total` must not be able to undercount past the names we
    // hold — "Ram with 0 others" next to three visible names is worse than
    // ignoring the total.
    expect(summarizeNames({ names: ["A", "B", "C"], total: 1 }, { t })).toBe(
      "common.nameSummary.withOthers|name=A|count=2|countLabel=२",
    );
  });

  it("drops blank, whitespace-only and null names before counting", () => {
    expect(
      summarizeNames({ names: ["  Ram  ", "", "   ", null, undefined, "Shyam"] }, { t }),
    ).toBe("common.nameSummary.withOthers|name=Ram|count=1|countLabel=१");
  });

  it("uses the fallback when the group has no usable name", () => {
    expect(summarizeNames({ names: ["  "] }, { t, fallback: "Unknown Entity" })).toBe(
      "Unknown Entity",
    );
  });

  it("makes no count claim on top of a fallback placeholder", () => {
    // No real names, so there is nothing to count from. Pairing the count with
    // a placeholder would invent a party count for a group we know nothing
    // about — "Unknown Entity with 2 others".
    expect(summarizeNames({ names: [], total: 3 }, { t, fallback: "Unknown Entity" })).toBe(
      "Unknown Entity",
    );
  });

  it("returns an empty string when there is nothing to show", () => {
    // The caller keys the whole row off this, so it has to be falsy rather than
    // a stray label with nothing after it.
    expect(summarizeNames({ names: [] }, { t })).toBe("");
    expect(summarizeNames({ names: [], total: 0 }, { t })).toBe("");
    expect(summarizeNames(undefined, { t })).toBe("");
    expect(summarizeNames(null, { t })).toBe("");
    expect(summarizeNames({}, { t })).toBe("");
  });
});

// The registry writes "and others" into the party field itself, in more than
// one shape. Our count is a FLOOR (it counts only the parties actually named),
// so replacing an open-ended marker with it would turn the court's deliberate
// vagueness into a hard number the record does not support.
describe("summarizeNames and the registry's own समेत", () => {
  it("leaves a bare समेत standing instead of substituting a count", () => {
    // Real shape, from District Court Bhaktapur 081-C1-0343: four names, the
    // first of which already ends in the marker. Substituting our count both
    // said समेत twice AND asserted exactly four parties.
    expect(
      summarizeNames(
        { names: ["सिलशोभा शाक्य समेत", "श्रद्धा पौडेल", "रामहरी खड्का क्षेत्री"], total: 4 },
        { t },
      ),
    ).toBe("सिलशोभा शाक्य समेत");
  });

  it("does not contradict a count the registry wrote itself", () => {
    // "प्रतिवादी समेत २" is the free-text form (this repo's own fixture, from
    // Special Court 082-CR-0154). Appending ours produced two different counts
    // in one line: "प्रतिवादी समेत २ समेत १ अन्य".
    expect(summarizeNames({ names: ["प्रतिवादी समेत २", "राम"], total: 2 }, { t })).toBe(
      "प्रतिवादी समेत २",
    );
  });

  it("keeps a lone marked name unchanged", () => {
    expect(summarizeNames({ names: ["मनिषा बुढा समेत"], total: 1 }, { t })).toBe(
      "मनिषा बुढा समेत",
    );
  });

  it("does not mistake a name that merely begins with those syllables", () => {
    // The marker is a separate word. "समेतकुमार" is somebody's name, so the
    // count must still be appended.
    expect(summarizeNames({ names: ["समेतकुमार श्रेष्ठ", "राम"], total: 2 }, { t })).toBe(
      "common.nameSummary.withOthers|name=समेतकुमार श्रेष्ठ|count=1|countLabel=१",
    );
  });
});
