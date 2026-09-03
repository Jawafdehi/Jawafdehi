import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";

import { formatNameCount, normalizeLanguage, summarizeNames } from "@/utils/name-summary";

// Stands in for i18next. It renders the key and the interpolation values rather
// than a sentence, so every assertion below pins down WHICH key was asked for
// and WHAT count was passed — the two decisions this module actually makes —
// instead of the wording of a locale resource that translators may reword.
const t = ((key: string, options?: Record<string, unknown>) =>
  `${key}|name=${options?.name}|count=${options?.count}|countLabel=${options?.countLabel}`) as unknown as TFunction;

describe("normalizeLanguage", () => {
  it("falls back to English for a language i18next has not resolved yet", () => {
    // i18next types `language` as string but leaves it undefined before init
    // and in tests; an unguarded `.startsWith` on it once crashed every card
    // on the search page.
    expect(normalizeLanguage(undefined)).toBe("en");
    expect(normalizeLanguage(null)).toBe("en");
    expect(normalizeLanguage("ne")).toBe("ne");
  });
});

describe("formatNameCount", () => {
  it("renders Devanagari digits under Nepali and ASCII otherwise", () => {
    expect(formatNameCount(3, "ne")).toBe("३");
    expect(formatNameCount(3, "en")).toBe("3");
    // Multi-digit: every digit converts, not just the first.
    expect(formatNameCount(12, "ne")).toBe("१२");
    expect(formatNameCount(2083, "ne")).toBe("२०८३");
  });

  it("treats any ne-* region as Nepali", () => {
    expect(formatNameCount(5, "ne-NP")).toBe("५");
  });
});

describe("summarizeNames", () => {
  it("returns a lone name with no count attached", () => {
    expect(summarizeNames({ names: ["राम बहादुर"] }, { t, language: "ne" })).toBe("राम बहादुर");
  });

  it("names the first party and counts the rest", () => {
    expect(summarizeNames({ names: ["Ram", "Shyam", "Hari"] }, { t, language: "en" })).toBe(
      "common.nameSummary.withOthers|name=Ram|count=2|countLabel=undefined",
    );
  });

  it("passes Nepali a pre-rendered Devanagari count and the raw one for pluralisation", () => {
    // Both values matter: i18next picks _one/_other off `count`, and only
    // `countLabel` is displayed. Dropping `count` would break the plural form;
    // dropping `countLabel` would print "3" inside a Nepali sentence.
    expect(summarizeNames({ names: ["राम", "श्याम", "हरि"] }, { t, language: "ne" })).toBe(
      "common.nameSummary.withOthersNepali|name=राम|count=2|countLabel=२",
    );
  });

  it("counts from the uncapped total, not from the names it was given", () => {
    // This is the whole reason the API sends `total` separately: it caps
    // `names` at PARTY_NAME_CAP (5), so counting the array would report
    // "with 4 others" on a case with nine parties and stop being true at the
    // cap.
    expect(
      summarizeNames({ names: ["A", "B", "C", "D", "E"], total: 9 }, { t, language: "en" }),
    ).toBe("common.nameSummary.withOthers|name=A|count=8|countLabel=undefined");
  });

  it("never claims fewer parties than the names already on screen", () => {
    // A stale or wrong `total` must not be able to undercount past the names
    // we hold — "Ram with 0 others" next to three visible names is worse than
    // ignoring the total.
    expect(summarizeNames({ names: ["A", "B", "C"], total: 1 }, { t, language: "en" })).toBe(
      "common.nameSummary.withOthers|name=A|count=2|countLabel=undefined",
    );
  });

  it("drops blank, whitespace-only and null names before counting", () => {
    expect(
      summarizeNames({ names: ["  Ram  ", "", "   ", null, undefined, "Shyam"] }, { t, language: "en" }),
    ).toBe("common.nameSummary.withOthers|name=Ram|count=1|countLabel=undefined");
  });

  it("uses the fallback when the group has no usable name", () => {
    expect(summarizeNames({ names: ["  "] }, { t, language: "en", fallback: "Unknown Entity" })).toBe(
      "Unknown Entity",
    );
  });

  it("returns an empty string when there is nothing to show", () => {
    // The caller keys the whole row off this, so it has to be falsy rather
    // than a stray label with nothing after it.
    expect(summarizeNames({ names: [] }, { t, language: "ne" })).toBe("");
    expect(summarizeNames({ names: [], total: 0 }, { t, language: "ne" })).toBe("");
    expect(summarizeNames(undefined, { t, language: "ne" })).toBe("");
    expect(summarizeNames(null, { t, language: "ne" })).toBe("");
    expect(summarizeNames({}, { t, language: "ne" })).toBe("");
  });

  it("summarizes with no language resolved yet", () => {
    // Court-case cards render during the first paint, before i18next reports a
    // language. That must produce the English key, not a crash.
    expect(summarizeNames({ names: ["Ram", "Shyam"] }, { t })).toBe(
      "common.nameSummary.withOthers|name=Ram|count=1|countLabel=undefined",
    );
  });
});
