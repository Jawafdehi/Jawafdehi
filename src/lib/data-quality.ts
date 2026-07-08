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
