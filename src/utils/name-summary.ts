import type { TFunction } from "i18next";

/**
 * "One name, and how many more" — the summary a result card renders in place of
 * a list of people it has no room for ("राम समेत ३ अन्यहरू").
 *
 * Shared, not per-card: the Jawafdehi case card summarises its subject entities
 * and the court-case card summarises each side's parties, and those two had
 * every reason to phrase, pluralise and localise the count identically and no
 * mechanism forcing them to. The wording lives in `common.nameSummary.*` for
 * the same reason — a card-scoped key would have to be read by the other card.
 */

// Kept local rather than imported from `bs-calendar`'s `toNepaliNumerals`: that
// module loads the `bikram-sambat` package at import time, and pulling a date
// library into every search-result card to map ten digits is not a trade worth
// making. Moved here from CaseCard, which is now one fewer copy, not one more.
const NEPALI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

// A court registry's free-text party field often already ends in "समेत" — its
// own way of saying "and others" without saying how many. Appending our count
// to that reads "… समेत समेत ३ अन्यहरू", so the vague marker gives way to the
// count that is about to state the same thing precisely. Measured at 12 of 900
// party sides sampled across all four court tiers, one of which had the
// `total > 1` needed to double it up.
//
// Only ever applied when a count IS being appended: on a lone party the name's
// own "समेत" is the only signal that other parties exist, and dropping it there
// would quietly narrow what the record claims.
const TRAILING_AND_OTHERS = /\s*समेत\s*$/;

/**
 * A group of names that may be larger than the names themselves.
 *
 * The search index caps the names it stores per party side (JawafdehiAPI
 * `courts.search_index.PARTY_NAME_CAP`) but deliberately leaves `total`
 * uncapped, which is the whole reason `total` is a separate field: it is what
 * keeps "+N others" honest on a case with more parties than the cap.
 */
export interface NameGroup {
  names?: readonly (string | null | undefined)[] | null;
  total?: number | null;
}

export interface NameSummaryOptions {
  t: TFunction;
  /** i18next's current language. */
  language?: string | null;
  /** Shown when the group carries no usable name (e.g. an "Unknown Entity" placeholder). */
  fallback?: string | null;
}

// i18next types `language` as `string`, but it can be transiently undefined —
// before init, and in tests. An unguarded `.startsWith` here once crashed card
// rendering across the whole search page, so every read goes through this.
export function normalizeLanguage(language?: string | null): string {
  return typeof language === "string" ? language : "en";
}

/**
 * Renders a count in the digits of the active language: Devanagari under
 * Nepali, ASCII otherwise. i18next's own `{{count}}` interpolation is always
 * ASCII, which is why the Nepali strings take a pre-rendered `countLabel`.
 */
export function formatNameCount(count: number, language?: string | null): string {
  const lang = normalizeLanguage(language);
  if (!lang.startsWith("ne")) return count.toString();
  return count.toString().replace(/\d/g, (digit) => NEPALI_DIGITS[Number(digit)]);
}

/**
 * The display string for a {@link NameGroup}: the first name alone, or the
 * first name plus how many others there are.
 *
 * Returns "" when there is neither a name nor a fallback, so a caller can drop
 * the whole row rather than render a label with nothing after it.
 */
export function summarizeNames(
  group: NameGroup | null | undefined,
  { t, language, fallback }: NameSummaryOptions,
): string {
  const names = (group?.names ?? [])
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter(Boolean);

  const firstName = names[0] || (typeof fallback === "string" ? fallback.trim() : "");
  if (!firstName) return "";

  // `total` wins when it is larger — that is the uncapped truth. It is floored
  // at the number of names we actually hold so a stale or wrong total can only
  // ever undercount into a smaller "+N", never claim fewer parties than the
  // names already on screen.
  const total = Math.max(group?.total ?? names.length, names.length);
  const remainingCount = Math.max(total - 1, 0);
  if (remainingCount === 0) return firstName;

  // Falls back to the untouched name if the marker was the whole of it, so a
  // party recorded only as "समेत" still renders something.
  const name = firstName.replace(TRAILING_AND_OTHERS, "") || firstName;

  const lang = normalizeLanguage(language);
  if (lang.startsWith("ne")) {
    // `count` still goes along: i18next selects the _one/_other plural form
    // from it, while `countLabel` is what actually gets shown.
    return t("common.nameSummary.withOthersNepali", {
      name,
      count: remainingCount,
      countLabel: formatNameCount(remainingCount, lang),
    });
  }

  return t("common.nameSummary.withOthers", {
    name,
    count: remainingCount,
  });
}
