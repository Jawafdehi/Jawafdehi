/**
 * बिगो (the alleged embezzled/disputed amount) range filter — the UI half of the
 * API's `?bigo_min` / `?bigo_max`.
 *
 * ## A slider, on a log scale
 *
 * Two thumbs over a ladder of round amounts, with text fields beneath — the
 * pattern every price filter uses, because everyone already knows it.
 *
 * The scale is LOGARITHMIC, and that is not a preference. The corpus spans six
 * orders of magnitude, ~रु ४५ हजार to ~रु ६६ अरब with a median near रु ५ करोड. On a
 * linear track across this 250px sidebar the median lands **0.19px** from the
 * left edge: half the corpus, and every case actually worth separating, inside a
 * single pixel. On the log ladder it sits at 123px — the middle of the track.
 * Baymard found 83% of filter sliders get this wrong.
 *
 * ## The value is an index, not an amount
 *
 * A thumb's position is an index into a ladder of round `1/2/5 × 10^k` figures.
 * That is log-spaced by construction and lands on numbers a reader recognises —
 * रु १ करोड, never रु १.०३ करोड. Because `aria-valuenow` is therefore an index,
 * each thumb carries `aria-valuetext` with the formatted amount; "7 of 20" tells
 * a screen-reader listener nothing about money.
 *
 * ## The edges mean "unbounded"
 *
 * The ladder floor sits at or below the smallest recorded amount and the ceiling
 * at or above the largest, so a thumb parked on either end is not a bound at all
 * and is omitted from the URL. Full track == no filter, which is what makes the
 * cleared state honest rather than a range that merely happens to match
 * everything.
 *
 * The ladder is derived HERE, from the corpus extent, rather than shipped by the
 * API. It used to be server-side because a histogram's bars had to be aggregated
 * on exactly the same edges; with the histogram gone there is nothing to line up
 * against, so the server sends only `min`/`max`/`count` and the scale is a pure
 * function of those.
 */
import { formatBigo } from "@/utils/number";

/** The corpus extent of the amount, from the API's `extents.bigo`. */
export interface BigoExtent {
  min: number;
  max: number;
  /** Documents carrying a recorded amount at all — the rest any bound excludes. */
  count: number;
}

/** A committed pair of bounds. `undefined` on a side means "no bound". */
export interface BigoBounds {
  min?: number;
  max?: number;
}

// Every 1/2/5 × 10^k up to 10 खरब. All are exact in float64 (well under 2**53),
// so index arithmetic never drifts.
const NICE_AMOUNTS: readonly number[] = (() => {
  const stops: number[] = [];
  for (let exponent = 0; exponent <= 12; exponent += 1) {
    for (const mantissa of [1, 2, 5]) stops.push(mantissa * 10 ** exponent);
  }
  return stops;
})();

/**
 * Whether the extent can drive a control at all.
 *
 * A corpus with nothing recorded would give the slider no track — better to
 * render nothing than a control pinned shut.
 */
export function hasUsableRails(extent?: BigoExtent): extent is BigoExtent {
  return Boolean(
    extent &&
      extent.count > 0 &&
      Number.isFinite(extent.min) &&
      Number.isFinite(extent.max),
  );
}

/**
 * The ladder of selectable amounts for a corpus of this extent, ascending.
 *
 * Widened outward to the surrounding round numbers so the ends genuinely bracket
 * the corpus — that is what lets an end-parked thumb mean "no bound".
 */
export function buildBigoLadder(extent: BigoExtent): number[] {
  const firstAbove = NICE_AMOUNTS.findIndex((stop) => stop > extent.min);
  let low = firstAbove === -1 ? NICE_AMOUNTS.length - 1 : firstAbove - 1;
  if (low < 0) low = 0;

  const firstAtOrAbove = NICE_AMOUNTS.findIndex((stop) => stop >= extent.max);
  let high = firstAtOrAbove === -1 ? NICE_AMOUNTS.length - 1 : firstAtOrAbove;

  // A corpus whose whole range sits between two stops (or a single case) would
  // collapse to one position — a slider pinned shut. Widen so there is a track.
  if (high <= low) {
    low = Math.max(0, low - 1);
    high = Math.min(NICE_AMOUNTS.length - 1, low + 2);
  }
  return NICE_AMOUNTS.slice(low, high + 1);
}

/**
 * The ladder position for a bound, or the given edge when there is no bound.
 *
 * Snaps to the NEAREST stop: a hand-edited `?bigo_min=52000000` need not sit on
 * one, and the thumb has to go somewhere. The URL keeps the literal value — the
 * snap moves the thumb, never the filter — until the reader drags, at which
 * point the ladder value becomes the truth.
 */
export function boundToIndex(
  ladder: number[],
  bound: number | undefined,
  edge: number,
): number {
  if (bound === undefined) return edge;
  let nearest = 0;
  for (let index = 1; index < ladder.length; index += 1) {
    if (Math.abs(ladder[index] - bound) < Math.abs(ladder[nearest] - bound)) {
      nearest = index;
    }
  }
  return nearest;
}

/**
 * The bound a thumb at this position represents — `undefined` at either end of
 * the ladder, which brackets the corpus and so constrains nothing.
 */
export function indexToBound(
  ladder: number[],
  index: number,
  side: "min" | "max",
): number | undefined {
  const atEdge = side === "min" ? index <= 0 : index >= ladder.length - 1;
  return atEdge ? undefined : ladder[index];
}

// The largest bound this module will emit — deliberately BELOW the API's own.
//
// The endpoint clamps to the signed-64-bit domain of the index's `long` mapping
// (2**63-1) and answers anything outside it with a 400. This module cannot go
// that high: a parsed bound is handed straight back out as `String(value)` — into
// the URL by normalizeArchiveSearchParams, into the request by readParams — and
// past MAX_SAFE_INTEGER a JS number stops round-tripping. `Number("9223372036854775807")`
// is 9223372036854775808, one ABOVE the ceiling, so admitting the API's maximum
// made the normalization step mint the very 400 it exists to prevent.
//
// Carrying bounds as BigInt end to end would be the alternative; it would ripple
// through every bound type, comparison and formatter for a range no case can
// occupy. The largest recorded बिगो is ~रु ६६ अरब — six orders of magnitude below
// this line — so the honest cut is "what can be stated exactly".
const BIGO_MAX_BOUND = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * A query-string बिगो bound as a number, or `undefined` if it is not one the API
 * would accept.
 *
 * Deliberately strict — digits only. A bound the API rejects comes back as a 400
 * and surfaces as the red "could not be loaded" alert, so a stale or fat-fingered
 * URL would read as an outage rather than as a filter to remove. `"1e9"`,
 * `"-1"`, `"1.5"` and `" 10"` are all things the DRF IntegerField refuses.
 *
 * Whatever comes back is guaranteed to survive `String()` unchanged, because that
 * is how it re-enters the URL and the request — see {@link BIGO_MAX_BOUND}.
 */
export function parseBigoBound(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  if (BigInt(raw) > BIGO_MAX_BOUND) return undefined;
  return Number(raw);
}

/**
 * Both बिगो bounds off a query string, with every rule the API would enforce
 * already applied.
 *
 * The single place that rule lives. URL normalization and the request builder
 * BOTH read through here on purpose: they run independently, and normalization
 * only rewrites the URL on an effect — a tick after the first render has already
 * fired its request. An inverted pair parses perfectly well bound-by-bound, so a
 * request builder doing its own parsing would send `bigo_min > bigo_max`, take a
 * 400, and flash the "could not be loaded" alert before the URL healed itself.
 */
export function readBigoBounds(params: URLSearchParams): BigoBounds {
  const min = parseBigoBound(params.get("bigo_min"));
  const max = parseBigoBound(params.get("bigo_max"));
  // Inverted → neither half survives. There is no way to tell which one was
  // meant, and honouring either applies a filter nobody asked for.
  if (min !== undefined && max !== undefined && min > max) return {};
  return { min, max };
}

/** The active range in words — for the thumbs' `aria-valuetext`, and the pill. */
export function describeBigoRange(
  min: number | undefined,
  max: number | undefined,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (min !== undefined && max !== undefined) {
    return translate("archiveSearch.filters.bigoRange.between", {
      defaultValue: "{{min}} – {{max}}",
      min: formatBigo(min),
      max: formatBigo(max),
    });
  }
  if (min !== undefined) {
    return translate("archiveSearch.filters.bigoRange.from", {
      defaultValue: "{{min}} and above",
      min: formatBigo(min),
    });
  }
  if (max !== undefined) {
    return translate("archiveSearch.filters.bigoRange.upTo", {
      defaultValue: "Up to {{max}}",
      max: formatBigo(max),
    });
  }
  return translate("archiveSearch.filters.bigoRange.any", {
    defaultValue: "Any amount",
  });
}
