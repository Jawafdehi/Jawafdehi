/**
 * बिगो (the alleged embezzled/disputed amount) bands for the archive-search
 * refine panel — the UI half of the API's `?bigo_min` / `?bigo_max` range.
 *
 * The API (JawafdehiAPI#450) exposes a GENERIC inclusive range in whole NPR, not
 * a fixed set of tiers, so the URL carries the RAW BOUNDS rather than a band id:
 * they are the API's own vocabulary, they survive being shared or hand-edited,
 * and there is no second dialect to keep in sync. The panel resolves the band
 * FROM the bounds, never the other way round.
 *
 * A hand-edited range matching no band is therefore still honoured — and still
 * renders a removable pill (see `describeBigoRange`). An applied filter with no
 * visible control is precisely the bug Jawafdehi#277 fixed for "Entity type";
 * dropping the bound instead would be the same class of surprise in reverse.
 *
 * Bands are mutually exclusive and inclusive on both sides, mirroring the API's
 * `gte`/`lte`. They are cut at the units these amounts are actually read in
 * (करोड / अरब), not at round powers of ten — the published corpus runs from
 * ~रु ४५ हजार to ~रु ६६ अरब with a median near रु ५ करोड, so a decimal split
 * would put almost everything in one bucket.
 */
import { formatBigo } from "@/utils/number";

const CRORE = 10_000_000;
const ARAB = 1_000_000_000;

export interface BigoBand {
  id: string;
  /** Inclusive lower bound (`?bigo_min`); absent means open-ended below. */
  min?: number;
  /** Inclusive upper bound (`?bigo_max`); absent means open-ended above. */
  max?: number;
  /** i18n key; `label` is the English fallback, per the FILTER_GROUPS idiom. */
  labelKey: string;
  label: string;
}

/** The sentinel the radio group uses for "no bound" — never a URL value. */
export const BIGO_BAND_ANY = "any";

export const BIGO_BANDS: readonly BigoBand[] = [
  {
    id: "under-1-crore",
    max: CRORE - 1,
    labelKey: "archiveSearch.filters.bigoBands.under1Crore",
    label: "Under Rs 1 Crore",
  },
  {
    id: "1-to-10-crore",
    min: CRORE,
    max: 10 * CRORE - 1,
    labelKey: "archiveSearch.filters.bigoBands.oneToTenCrore",
    label: "Rs 1–10 Crore",
  },
  {
    id: "10-crore-to-1-arab",
    min: 10 * CRORE,
    max: ARAB - 1,
    labelKey: "archiveSearch.filters.bigoBands.tenCroreToOneArab",
    label: "Rs 10 Crore – 1 Arab",
  },
  {
    id: "over-1-arab",
    min: ARAB,
    labelKey: "archiveSearch.filters.bigoBands.overOneArab",
    label: "Over Rs 1 Arab",
  },
];

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

/** The band exactly matching these bounds, if any. */
export function findBigoBand(
  min?: number,
  max?: number,
): BigoBand | undefined {
  if (min === undefined && max === undefined) return undefined;
  return BIGO_BANDS.find((band) => band.min === min && band.max === max);
}

/**
 * The pill label for an active range: the band's own label when the bounds are
 * one of the presets, otherwise a formatted description of the literal range so
 * a hand-edited URL still shows what it is filtering by.
 */
export function describeBigoRange(
  min: number | undefined,
  max: number | undefined,
  translate: (key: string, options?: Record<string, unknown>) => string,
): string {
  const band = findBigoBand(min, max);
  if (band) return translate(band.labelKey, { defaultValue: band.label });

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
  return translate("archiveSearch.filters.bigoRange.upTo", {
    defaultValue: "Up to {{max}}",
    max: formatBigo(max as number),
  });
}
