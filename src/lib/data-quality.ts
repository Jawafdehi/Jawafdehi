import { formatDistanceToNow } from "date-fns";

/**
 * The "register" data face, as an inline font stack for SVG chart text
 * (recharts ticks / labels) where a Tailwind `font-mono` class can't reach.
 * Mirrors `fontFamily.mono` in tailwind.config.ts.
 */
export const MONO_STACK =
  "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * "3 hours ago" — a human-friendly freshness string for the snapshot's
 * `last_updated` timestamp, or null when the timestamp is missing/invalid.
 */
export function formatFreshness(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true });
}
