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
 *
 * NOTE there is deliberately no language branch in here. Every call passes both
 * `count` (ASCII, and what i18next selects the plural form from) and
 * `countLabel` (Devanagari), and each locale file interpolates the one it wants
 * — `en.json` uses `{{count}}`, `ne.json` uses `{{countLabel}}`. Choosing the
 * key by language instead, as this module first did, meant asking for the
 * English key whenever `i18n.language` was not yet resolved, which i18next then
 * answered from the Nepali bundle (the app is Nepali-first: `lng`/`fallbackLng`
 * are both `ne`) and rendered "राम समेत 3 अन्यहरू" — Latin digits inside a
 * Nepali sentence, the single thing `countLabel` exists to prevent. Keeping the
 * representation choice in the resource file makes that unrepresentable.
 */

// Kept local rather than imported from `bs-calendar`'s `toNepaliNumerals`: that
// module loads the `bikram-sambat` package at import time, and pulling a date
// library into every search-result card to map ten digits is not a trade worth
// making. Moved here from CaseCard, which is now one fewer copy, not one more.
const NEPALI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

/**
 * A court registry often names a party as "X समेत" — "X and others" — with the
 * registry declining to say how many, and sometimes with a count of its own
 * ("प्रतिवादी समेत २"). Both forms are matched, bounded so a name that merely
 * starts with those syllables (समेतकुमार) is not caught.
 *
 * When this matches, the name is rendered verbatim and NO count is appended.
 * See {@link summarizeNames} for why that is the honest reading.
 */
const AND_OTHERS_MARKER = /(?:^|\s)समेत(?=$|[\s०-९0-9])/;

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
  /** Shown when the group carries no usable name (e.g. an "Unknown Entity" placeholder). */
  fallback?: string | null;
}

/**
 * Normalises i18next's current language.
 *
 * i18next types `language` as `string`, but it can be transiently undefined —
 * before init, and in tests. An unguarded `.startsWith` on it once crashed card
 * rendering across the whole search page, so every read goes through this.
 *
 * Defaults to **Nepali**, not English: `src/i18n/config.ts` sets `lng: 'ne'`
 * and `fallbackLng: 'ne'`, and the SSR prerender is Nepali too, so `ne` is what
 * an unresolved language is about to become. Defaulting to `en` made a reader
 * momentarily see English court names and AD dates on a Nepali page.
 */
export function normalizeLanguage(language?: string | null): string {
  return typeof language === "string" ? language : "ne";
}

/** Renders a number in Devanagari digits, for locales that want them. */
export function toNepaliDigits(count: number): string {
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
  { t, fallback }: NameSummaryOptions,
): string {
  const names = (group?.names ?? [])
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter(Boolean);

  const firstName = names[0] || (typeof fallback === "string" ? fallback.trim() : "");
  if (!firstName) return "";

  // No real names, only the placeholder — so make no claim about how many
  // parties there are. `total` can still be non-zero here on a hand-built
  // group, and pairing it with "Unknown Entity" would invent a party count.
  if (names.length === 0) return firstName;

  // The record already says "and others" in its own words, open-endedly. Our
  // count is NOT the same statement: `total` counts only the parties actually
  // NAMED (search_index.py: `len(unique)`), so it is a floor, and replacing the
  // marker with it would publish "and 3 others" — a hard count of four — where
  // the source said "and an unspecified number more". On a court record that
  // trades the registry's deliberate vagueness for false precision, so the
  // marker wins and the count is dropped. It also sidesteps saying समेत twice
  // ("… समेत समेत ३ अन्यहरू") and contradicting a count the registry wrote
  // itself ("प्रतिवादी समेत २ समेत १ अन्य").
  if (AND_OTHERS_MARKER.test(firstName)) return firstName;

  // `total` wins when it is larger — that is the uncapped truth. It is floored
  // at the number of names we actually hold so a stale or wrong total can only
  // ever undercount into a smaller "+N", never claim fewer parties than the
  // names already on screen.
  const total = Math.max(group?.total ?? names.length, names.length);
  const remainingCount = Math.max(total - 1, 0);
  if (remainingCount === 0) return firstName;

  return t("common.nameSummary.withOthers", {
    name: firstName,
    count: remainingCount,
    countLabel: toNepaliDigits(remainingCount),
  });
}
