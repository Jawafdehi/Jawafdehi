/**
 * Record-date range filter — the UI half of the API's `?date_from` / `?date_to`.
 *
 * Deliberately the same shape as `bigo-range.ts`, one layer simpler. Both bound a
 * single indexed field from two sides; the difference is that dates need no
 * ladder. A calendar is already a scale a reader can read, and the browser ships
 * the widget, so this module owns only the rules — parsing, the inverted-pair
 * decision, and the preset arithmetic.
 *
 * ## Bounds are STRINGS, not Dates
 *
 * `YYYY-MM-DD` is what the API takes, what `<input type="date">` reads and
 * writes, and what goes in the URL. Parsing to a `Date` and back would add two
 * conversions whose only job is to reintroduce a timezone: `new Date("2024-01-15")`
 * is midnight **UTC**, which in Nepal's +05:45 is already the 15th at 05:45 — and
 * `toISOString()` on a local-midnight Date lands on the *previous* day. Carrying
 * the string end to end means the date a reader picks is the date that gets
 * filtered. `localIsoDate` below is the only place a Date becomes a string, and it
 * reads local fields for exactly that reason.
 *
 * ## Coverage is not total
 *
 * A `range` clause cannot match a document with no date, so ANY bound drops the
 * ~7% of materials that carry none (321,886 of 345,924 have one, measured
 * 2026-09-10). Entities carry no date at all, so a bound excludes every entity
 * result — which is why the control is scoped to the tabs whose records have
 * dates, and why the note in `DateRangeFilter` says so out loud. Same reasoning
 * as the बिगो caveat: on an accountability archive, "this filter cannot see them"
 * and "there are none" must not look alike.
 */

/** A committed pair of bounds. `undefined` on a side means "no bound". */
export interface DateBounds {
  from?: string;
  to?: string;
}

/** The quick-pick windows, in the order they render. `all` clears both bounds. */
export const DATE_PRESETS = ["all", "30-days", "6-months", "1-year"] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];

/**
 * A `Date` as `YYYY-MM-DD` in the LOCAL zone.
 *
 * Not `toISOString().slice(0, 10)`: that is UTC, so any local time before 05:45
 * in Nepal formats as yesterday. Same helper, same reason, as the one in
 * `MaterialSeriesBrowse`.
 */
export function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * A query-string date bound as `YYYY-MM-DD`, or `undefined` if it is not one the
 * API would accept.
 *
 * Strict on both counts — shape AND calendar. DRF's `DateField` answers
 * "2026-13-45", "2026-02-31" and "15/01/2026" with a 400, which this page renders
 * as the red "could not be loaded" alert; a stale bookmark must degrade into a
 * wider result set, not into what reads as a search outage.
 *
 * The round-trip is exact: what comes out is the same string that went in, so it
 * can go straight back into the URL and the request.
 */
export function parseDateBound(raw: string | null): string | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  // Shape alone admits impossible dates. Re-format what the Date constructor
  // made of it and require it to match: "2026-02-31" parses as 3 March and so
  // fails, while "2026-02-28" round-trips. Parsed as UTC and read back with the
  // UTC getters — mixing the two would shift the day and reject valid dates.
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}` === raw ? raw : undefined;
}

/**
 * Both date bounds off a query string, with every rule the API would enforce
 * already applied.
 *
 * The single place that rule lives, read by BOTH the URL normalizer and the
 * request builder — for the reason spelled out in `readBigoBounds`. They run
 * independently, and normalization only rewrites the URL an effect later, a tick
 * after the first render has already fired its request. An inverted pair parses
 * perfectly well bound-by-bound, so a request builder doing its own parsing would
 * send `date_from > date_to`, take a 400, and flash the alert before the URL
 * healed itself.
 */
export function readDateBounds(params: URLSearchParams): DateBounds {
  const from = parseDateBound(params.get("date_from"));
  const to = parseDateBound(params.get("date_to"));
  // Inverted → neither half survives. There is no way to tell which was meant,
  // and honouring either applies a filter nobody asked for. ISO dates compare
  // correctly as strings, which is the whole point of the format.
  if (from !== undefined && to !== undefined && from > to) return {};
  return { from, to };
}

/**
 * The `date_from` a preset selects, or `""` for `all`.
 *
 * A preset sets the LOWER bound only — "last 30 days" runs to whatever the newest
 * record is, and pinning an upper bound at today would silently exclude a
 * document published with tomorrow's date (the corpus has them: a notice dated
 * for its deadline).
 *
 * `today` is a parameter rather than a `new Date()` inside, so the arithmetic is
 * testable without freezing the clock.
 */
export function presetStartDate(preset: DatePreset, today: Date): string {
  if (preset === "all") return "";
  const start = new Date(today.getTime());
  if (preset === "30-days") start.setDate(start.getDate() - 30);
  if (preset === "6-months") start.setMonth(start.getMonth() - 6);
  if (preset === "1-year") start.setFullYear(start.getFullYear() - 1);
  return localIsoDate(start);
}

/**
 * Which preset the current bounds correspond to, or `null` when they are a custom
 * range.
 *
 * Presets are derived from the bounds rather than stored beside them: the URL is
 * the only state, so a shared link, the back button and a pill removal all have
 * to produce the right pressed pill with nothing else to consult. A preset is a
 * lower bound with no upper bound, matching what `presetStartDate` would emit
 * today.
 */
export function activePreset(
  bounds: DateBounds,
  today: Date,
): DatePreset | null {
  if (bounds.from === undefined && bounds.to === undefined) return "all";
  if (bounds.to !== undefined || bounds.from === undefined) return null;
  return (
    DATE_PRESETS.find(
      (preset) => preset !== "all" && presetStartDate(preset, today) === bounds.from,
    ) ?? null
  );
}

/** The active range in words — for the removable pill above the results. */
export function describeDateRange(
  from: string | undefined,
  to: string | undefined,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (from !== undefined && to !== undefined) {
    return translate("archiveSearch.filters.dateRange.between", {
      defaultValue: "{{from}} – {{to}}",
      from,
      to,
    });
  }
  if (from !== undefined) {
    return translate("archiveSearch.filters.dateRange.from", {
      defaultValue: "{{from}} onwards",
      from,
    });
  }
  if (to !== undefined) {
    return translate("archiveSearch.filters.dateRange.upTo", {
      defaultValue: "Up to {{to}}",
      to,
    });
  }
  return translate("archiveSearch.filters.dateRange.any", {
    defaultValue: "Any date",
  });
}
