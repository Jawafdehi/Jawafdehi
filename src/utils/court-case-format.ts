const COURT_NAMES_EN: Record<string, string> = {
  special: "Special Court",
  supreme: "Supreme Court",
  high: "High Court",
  district: "District Court",
  appellate: "Appellate Court",
};

const COURT_NAMES_NE: Record<string, string> = {
  special: "विशेष अदालत",
  supreme: "सर्वोच्च अदालत",
};

export type CourtStatusBadgeValue =
  | "resolved"
  | "ongoing"
  | "under-investigation";

/**
 * The court tiers, and the only four values the API's `court_type` facet holds
 * (JawafdehiAPI `search.service.ALL_COURT_TYPES`).
 */
export type CourtTypeValue = "district" | "high" | "special" | "supreme";

const COURT_TYPES: readonly CourtTypeValue[] = [
  "district",
  "high",
  "special",
  "supreme",
];

/**
 * Resolve a court case's tier, preferring the API's own `court_type` and
 * falling back to the court identifier.
 *
 * `extra.court_type` is on every court-case hit today — sampled 50 per tier
 * plus 50 unfiltered against production, with no gaps — so the fallback is not
 * the normal path. It exists because that field is promoted from a top-level
 * index field and so is absent on documents written before the index was
 * rebuilt for it, whereas `extra.court` is sourced from `raw` and is present on
 * every court-case document ever indexed.
 *
 * Deriving it is safe because the identifier suffix IS the tier: checked
 * against all 97 courts in GET /api/courts/, the `*dc`/`*hc`/`special`/
 * `supreme` rule reproduces `court_type` with zero disagreements.
 */
export function courtTypeValue(
  court: string | null | undefined,
  courtType?: string | null,
): CourtTypeValue | null {
  const explicit = courtType?.trim().toLowerCase();
  const known = COURT_TYPES.find((value) => value === explicit);
  if (known) return known;

  const lower = court?.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (!lower) return null;

  if (lower === "special" || lower === "specialcourt") return "special";
  if (lower === "supreme" || lower === "supremecourt") return "supreme";
  if (lower.endsWith("hc")) return "high";
  if (lower.endsWith("dc")) return "district";

  // Anything else (e.g. the retired "appellate" courts, which `court_type`
  // has no value for) gets no tier rather than a wrong one.
  return null;
}

/**
 * Formats a court identifier (e.g., "kanchanpurdc", "butwalhc", "special")
 * into a human-readable court name in either English or Nepali.
 */
export function formatCourtName(court: string | null | undefined, lang = "en"): string {
  const value = court?.trim();
  if (!value) return "";

  const lower = value.toLowerCase().replace(/[\s_-]+/g, "");

  if (lower === "special" || lower === "specialcourt") {
    return lang.startsWith("ne") ? COURT_NAMES_NE.special : COURT_NAMES_EN.special;
  }
  if (lower === "supreme" || lower === "supremecourt") {
    return lang.startsWith("ne") ? COURT_NAMES_NE.supreme : COURT_NAMES_EN.supreme;
  }

  // Suffix matching: butwalhc -> Butwal High Court
  if (lower.endsWith("hc")) {
    const base = lower.slice(0, -2);
    const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
    return lang.startsWith("ne") ? `${capitalized} उच्च अदालत` : `${capitalized} High Court`;
  }

  // Suffix matching: kanchanpurdc -> Kanchanpur District Court
  if (lower.endsWith("dc")) {
    const base = lower.slice(0, -2);
    const capitalized = base.charAt(0).toUpperCase() + base.slice(1);
    return lang.startsWith("ne") ? `${capitalized} जिल्ला अदालत` : `${capitalized} District Court`;
  }

  const courtKey = Object.keys(COURT_NAMES_EN).find((key) => lower.includes(key));
  if (courtKey) {
    return lang.startsWith("ne") && COURT_NAMES_NE[courtKey]
      ? COURT_NAMES_NE[courtKey]
      : COURT_NAMES_EN[courtKey];
  }

  const spaced = value.replace(/[_-]+/g, " ");
  if (spaced !== spaced.toUpperCase()) return spaced;
  return spaced
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

/**
 * Maps a raw court status string to a CaseStatusBadge value.
 */
export function courtStatusBadgeValue(
  status: string | null | undefined,
): CourtStatusBadgeValue {
  if (!status) return "under-investigation";
  const normalized = status.toLowerCase();
  if (
    normalized.includes("फैसला") ||
    normalized.includes("decision") ||
    normalized.includes("decided") ||
    normalized.includes("verdict") ||
    normalized.includes("closed") ||
    normalized.includes("resolved") ||
    normalized.includes("concluded")
  ) {
    return "resolved";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("progress") ||
    normalized.includes("sub judice") ||
    normalized.includes("sub_judice") ||
    normalized.includes("विचाराधीन") ||
    normalized.includes("चालु") ||
    normalized.includes("ongoing")
  ) {
    return "ongoing";
  }
  return "under-investigation";
}
