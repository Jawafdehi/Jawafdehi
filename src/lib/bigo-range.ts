/**
 * बिगो (the alleged embezzled/disputed amount) range filter — the UI half of the
 * API's `?bigo_min` / `?bigo_max`.
 *
 * ## The scale comes from the server
 *
 * `extents.bigo` carries `stops` (positions a thumb may take) and `buckets` (the
 * histogram bars, with counts). Both are aggregated server-side on exactly those
 * edges, so this module renders what it is given rather than deriving a ladder of
 * its own — a client-side ladder would draw bars whose counts belong to other
 * buckets.
 *
 * The scale is logarithmic because the corpus is: ~रु ४५ हजार to ~रु ६६ अरब with a
 * median near रु ५ करोड. Baymard's filter research found 83% of sliders wrongly use
 * a linear scale on unevenly distributed values, and measured the cost — on one
 * site 50% of the slider's width controlled 2% of the catalogue. Round 1/2/5 stops
 * also mean a reader lands on रु १ करोड, never रु १.०३ करोड.
 *
 * ## The edges mean "unbounded"
 *
 * The stop ladder brackets the corpus, so a thumb parked on either end is not a
 * bound and is omitted from the URL. Full track == no filter, which is what makes
 * the cleared state honest rather than a range that happens to match everything.
 */
import { formatBigo } from "@/utils/number";

/** One histogram bar. Open-ended bars carry a null bound, not a fabricated one. */
export interface BigoBucket {
  from: number | null;
  to: number | null;
  count: number;
}

/** The corpus extent of the amount, from the API's `extents.bigo`. */
export interface BigoExtent {
  min: number;
  max: number;
  /** Documents carrying a recorded amount at all — the rest any bound excludes. */
  count: number;
  /** Histogram bars, aggregated over the query and facets but NOT the बिगो range. */
  buckets: BigoBucket[];
  /** Positions a slider thumb may take, ascending. */
  stops: number[];
}

/**
 * Whether the extent can drive a control at all.
 *
 * A corpus with nothing recorded, or one whose whole range sits between two
 * stops, would give a slider no track to drag along — better to render nothing
 * than a control pinned shut.
 */
export function hasUsableRails(extent?: BigoExtent): extent is BigoExtent {
  return Boolean(extent && extent.count > 0 && extent.stops.length >= 2);
}

/**
 * The ladder position for a bound, or the given edge when there is no bound.
 *
 * Snaps to the NEAREST stop: a hand-edited `?bigo_min=50000000` need not sit on
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

// The API clamps both bounds to the signed-64-bit domain of the index's `long`
// mapping and answers anything outside it with a 400. Compared as BigInt because
// the ceiling is past Number.MAX_SAFE_INTEGER, where `Number()` would round a
// just-over value back under the limit and wave it through.
const BIGO_MAX_BOUND = 2n ** 63n - 1n;

/**
 * A query-string बिगो bound as a number, or `undefined` if it is not one the API
 * would accept.
 *
 * Deliberately strict — digits only. A bound the API rejects comes back as a 400
 * and surfaces as the red "could not be loaded" alert, so a stale or fat-fingered
 * URL would read as an outage rather than as a filter to remove. `"1e9"`,
 * `"-1"`, `"1.5"` and `" 10"` are all things the DRF IntegerField refuses.
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
export function readBigoBounds(params: URLSearchParams): {
  min?: number;
  max?: number;
} {
  const min = parseBigoBound(params.get("bigo_min"));
  const max = parseBigoBound(params.get("bigo_max"));
  // Inverted → neither half survives. There is no way to tell which one was
  // meant, and honouring either applies a filter nobody asked for.
  if (min !== undefined && max !== undefined && min > max) return {};
  return { min, max };
}

/** The active range in words — for the readout above the track, and the pill. */
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
