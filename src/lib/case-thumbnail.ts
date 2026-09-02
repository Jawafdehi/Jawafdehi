// Pure logic for the generative case thumbnail (the tier-3 fallback card).
//
// A case with no usable image renders a deterministic "data portrait" instead
// of a shared placeholder illustration: the बिगो amount leads typographically,
// backed by a radial glyph whose arc encodes the amount, with dots for the
// accused count and spokes for timeline events. Everything here is derived
// only from the case's own fields, so the same case always renders the same
// thumbnail (no randomness, no per-render state).

// NOTE: deliberately no import from @/utils/bs-calendar here. That module
// imports the whole bikram-sambat package at top level; case cards render on
// eager pre-rendered routes, so importing it would drag the calendar package
// into the entry chunk (it blew the bundle budget in CI). The digit mapping
// below is all this module needs.

/**
 * FNV-1a hash of the case slug. Drives the glyph's per-case rotation so two
 * adjacent cards with similar numbers still read as distinct. Deterministic:
 * same slug, same hash, forever.
 */
export function hashSlug(slug: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Arc bands, anchored at the Nepali currency unit boundaries the amounts are
// read in (लाख / करोड / अरब). A raw log scale over the dataset's full range
// (tens of thousands to tens of billions) compresses ordinary करोड-scale cases
// into nearly identical arcs; banding guarantees that crossing a unit boundary
// visibly grows the arc, and log-interpolating inside a band keeps ordering.
const ARC_BANDS: Array<{ min: number; max: number; from: number; to: number }> = [
  { min: 0, max: 1e5, from: 0.1, to: 0.2 }, // below 1 लाख
  { min: 1e5, max: 1e7, from: 0.2, to: 0.45 }, // लाख
  { min: 1e7, max: 1e9, from: 0.45, to: 0.75 }, // करोड
  { min: 1e9, max: 1e11, from: 0.75, to: 0.95 }, // अरब
];

/**
 * Fraction (0..1) of the glyph ring the amount arc should sweep. 0 for
 * missing/zero amounts (the caller renders a dashed ring instead).
 */
export function bigoArcFraction(bigo: number | null | undefined): number {
  if (!bigo || bigo <= 0) return 0;
  const band = ARC_BANDS.find((b) => bigo >= b.min && bigo < b.max) ?? ARC_BANDS[ARC_BANDS.length - 1];
  if (bigo >= 1e11) return 0.95;
  const lo = Math.max(band.min, 1); // avoid log(0) in the first band
  const t = Math.log10(bigo / lo) / Math.log10(band.max / lo);
  return band.from + (band.to - band.from) * Math.min(Math.max(t, 0), 1);
}

export interface CompactBigo {
  /** Numeral part, localized ("5.05" / "५.०५"). */
  value: string;
  /** Unit word, localized ("Crore" / "करोड"). Empty below 1 लाख. */
  unit: string;
  /** Currency prefix ("Rs" / "रु"). */
  prefix: string;
}

const UNITS: Array<{ threshold: number; en: string; ne: string }> = [
  { threshold: 1e11, en: "Kharab", ne: "खर्ब" },
  { threshold: 1e9, en: "Arab", ne: "अरब" },
  { threshold: 1e7, en: "Crore", ne: "करोड" },
  { threshold: 1e5, en: "Lakh", ne: "लाख" },
];

/**
 * Compact, locale-aware बिगो for the thumbnail's lead figure. Mirrors
 * `formatBigo`'s unit boundaries but splits value/unit so the component can
 * typeset them at different sizes, and renders Nepali numerals in `ne`.
 */
export function formatBigoCompact(amount: number, language: string): CompactBigo {
  const ne = language.startsWith("ne");
  const prefix = ne ? "रु" : "Rs";
  for (const u of UNITS) {
    if (amount >= u.threshold) {
      const raw = (amount / u.threshold).toFixed(2);
      return { value: ne ? toNepaliDecimal(raw) : raw, unit: ne ? u.ne : u.en, prefix };
    }
  }
  const raw = amount.toLocaleString("en-IN");
  return { value: ne ? toNepaliDecimal(raw) : raw, unit: "", prefix };
}

/** Localize a number the thumbnail shows inline (counts). */
export function formatCount(count: number, language: string): string {
  return language.startsWith("ne") ? toNepaliDecimal(String(count)) : String(count);
}

// `toNepaliNumerals` takes a number and would mangle decimal strings via
// String() round-trips; map digit characters directly so "5.05" and "1,23,456"
// keep their separators.
function toNepaliDecimal(raw: string): string {
  const digits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return raw.replace(/\d/g, (d) => digits[Number(d)]);
}
