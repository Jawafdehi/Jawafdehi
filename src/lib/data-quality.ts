import type { TFunction } from "i18next";

/**
 * The "register" data face, as an inline font stack for SVG chart text
 * (recharts ticks / labels) where a Tailwind `font-mono` class can't reach.
 * Mirrors `fontFamily.mono` in tailwind.config.ts.
 */
export const MONO_STACK =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * "3 hours ago" — a human-friendly, LOCALIZED freshness string for the
 * snapshot's `last_updated` timestamp, or null when the timestamp is
 * missing/invalid.
 *
 * Rolls a small relative-time formatter instead of reaching for date-fns'
 * `formatDistanceToNow`: the installed date-fns (v3) ships no Nepali ("ne")
 * locale, so that call always renders in English regardless of the active UI
 * language, producing a mixed-language string in Nepali mode (e.g.
 * "डेटा 3 hours ago अद्यावधिक गरिएको"). `t` drives the unit words via
 * i18next's `_one`/`_other` pluralization, the same convention already used
 * elsewhere in this app (see `guestAnswerBlock.resultSummary`).
 */
export function formatFreshness(
  iso: string | null | undefined,
  t: TFunction,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return t("dataQuality.ribbon.freshness.justNow", "just now");

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("dataQuality.ribbon.freshness.minutesAgo", { count: minutes });

  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("dataQuality.ribbon.freshness.hoursAgo", { count: hours });

  const days = Math.round(hours / 24);
  if (days < 30) return t("dataQuality.ribbon.freshness.daysAgo", { count: days });

  const months = Math.round(days / 30);
  return t("dataQuality.ribbon.freshness.monthsAgo", { count: months });
}

/**
 * Gregorian span a Bikram Sambat year covers, as a start year and two-digit
 * tail: BS 2081 -> "2024/25".
 *
 * Pure arithmetic, no calendar conversion: the BS year turns in mid-Baishakh
 * (mid-April), so it always opens in AD year BS-57 and closes in BS-56. The pair
 * is the point — it says out loud that no single AD year lines up with a BS one,
 * which is exactly the confusion an AD-labelled axis used to create here.
 */
export function adSpanForBsYear(bsYear: number): string {
  const start = bsYear - 57;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * Per-year rows that actually carry a BS year, dropping any that don't.
 *
 * Guards the deploy window: the API and this app ship independently, so for a
 * few minutes the served statistics snapshot can still be the pre-cutover one
 * keyed by an AD `year`. Rendering that anyway is not a cosmetic blemish — every
 * row collapses into a single `undefined` year, so the heatmap silently merges
 * two decades into one column while its totals still look right, and the year
 * filter offers "BS  (AD NaN/NaN)". Dropping the rows falls back to the section's
 * designed empty state (the charts already render nothing without their field)
 * and self-heals on the next snapshot refresh.
 */
export function bsYearRows<T>(rows: readonly T[] | undefined): T[] {
  return (rows ?? []).filter(
    (row) => typeof (row as { bs_year?: unknown }).bs_year === "number",
  );
}

/**
 * Full, calendar-marked year label for tooltips and screen readers — "BS 2081
 * (AD 2024/25)", and in Nepali "वि.सं. 2081 (सन् 2024/25)".
 *
 * Chart ticks and column headers stay bare numbers (a marker on all 25 of them
 * is noise); the calendar is declared once in the section heading and spelled
 * out in full here, where a reader who needs the Gregorian anchor goes looking.
 */
export function bsYearWithAd(bsYear: number, t: TFunction): string {
  return t("dataQuality.courtCases.yearLabel", "BS {{bs}} (AD {{ad}})", {
    bs: bsYear,
    ad: adSpanForBsYear(bsYear),
  });
}

/**
 * Percentage computed from raw counts and TRUNCATED, not rounded, so an
 * incomplete figure can never read as a clean 100%. The live API's own
 * pre-computed completeness values round (e.g. 1,610,701 / 1,610,771 up to
 * 100.0); computing from the counts and truncating shows the honest 99.99.
 * Shared by every section that displays a completeness percentage, so the
 * same metric never shows a different, more-rounded number in one section
 * than another.
 */
export function truncPct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.floor((part / whole) * 10000) / 100;
}
