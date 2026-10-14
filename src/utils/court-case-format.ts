const COURT_NAMES_EN: Record<string, string> = {
  special: "Special Court",
  supreme: "Supreme Court",
  high: "High Court",
  district: "District Court",
  appellate: "Appellate Court",
};

// The tier names here are the same words `formatCourtName` already appends to a
// district/high identifier below ("… जिल्ला अदालत"), spelled once. They are
// reached only by a BARE tier token — every one of the 96 courts the search
// facet returns ends in `dc`/`hc` or is `special`/`supreme`, so no court
// identifier resolves through this map.
const COURT_NAMES_NE: Record<string, string> = {
  special: "विशेष अदालत",
  supreme: "सर्वोच्च अदालत",
  high: "उच्च अदालत",
  district: "जिल्ला अदालत",
  appellate: "पुनरावेदन अदालत",
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
 * Names a court TIER — the four values the search API's `court_type` facet
 * holds (`ALL_COURT_TYPES`) — in either language.
 *
 * Distinct from `formatCourtName`, which names ONE court: "district" is the
 * tier "District Court", where "kathmandudc" is "Kathmandu District Court".
 * Kept here rather than at the call site so both spellings of "District Court"
 * come from the same two maps and cannot drift apart between the facet sidebar
 * and the court-case cards.
 */
export function formatCourtType(
  courtType: string | null | undefined,
  lang = "en",
): string {
  const value = courtType?.trim().toLowerCase();
  if (!value) return "";
  if (lang.startsWith("ne") && COURT_NAMES_NE[value]) {
    return COURT_NAMES_NE[value];
  }
  // The vocabulary is closed, so the fallback is unreachable on live data; it
  // humanizes rather than dropping a bucket the reader can see a count for.
  return COURT_NAMES_EN[value] ?? formatCourtName(courtType, lang);
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

/**
 * What a court case's status should actually SHOW.
 *
 * `case_status` arrives as raw scraper output, and the register writes one
 * state four different ways. Measured against the 2,290,879 rows in
 * `court_cases` (2026-10-14), the entire non-null vocabulary is:
 *
 *   चालु                              270,650   pending
 *   चलिरहेको                           53,867   pending — the same state, other word
 *   फैसला / अन्तिम आदेश >> <outcome> ~1,212,871  decided, outcome enumerable
 *   फैसला (<BS date>)                 534,495   decided, date recoverable
 *   फैसला                                 134   decided
 *   अन्तिम आदेश                             3   decided
 *
 * Printing that verbatim is what a reviewer flagged: two cards side by side
 * reading चालु and चलिरहेको look like different states. It also puts a date
 * inside a status pill, and on 322 rows prints the literal string
 * `फैसला / अन्तिम आदेश >> undefined`.
 *
 * So the pill gets the normalized STATE, and the register's own detail — the
 * outcome, or the decision date — comes back as a separate field rather than
 * being thrown away. Callers render `detail` outside the pill.
 *
 * Anything unrecognized keeps its raw text as the detail and falls to the
 * pending state, so a vocabulary change degrades to today's behaviour rather
 * than hiding a status we have never seen.
 */
export interface CourtStatusDisplay {
  /** i18n key for the one word the pill shows. */
  labelKey: string;
  /** English default for `labelKey`, so the two cannot drift across callers. */
  labelFallback: string;
  /** The register's own wording, for display beside the pill. */
  detail: string | null;
}

const DECIDED = {
  labelKey: "courtCaseDetail.status.decided",
  labelFallback: "Decided",
} as const;
const PENDING = {
  labelKey: "courtCaseDetail.status.pending",
  labelFallback: "Ongoing",
} as const;

/** Scraper placeholders that must never reach a reader. */
const EMPTY_OUTCOMES = new Set(["undefined", "null", "-", "अन्य"]);

/** A BS date is only shown when it is actually a date: ####/##/## in range. */
function usableBsDate(raw: string): string | null {
  const ascii = raw.replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d)));
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(ascii.trim());
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  if (year < 1900 || year > 2200) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 32) return null;
  return raw.trim();
}

export function courtStatusDisplay(
  status: string | null | undefined,
): CourtStatusDisplay | null {
  const trimmed = status?.trim();
  if (!trimmed) return null;

  // Shape 1: "फैसला / अन्तिम आदेश >> <outcome>". The outcome is the point —
  // "अभियोग दाबी नपुग्ने" is a finding, not decoration — so it survives.
  const arrow = trimmed.indexOf(">>");
  if (arrow !== -1) {
    const outcome = trimmed.slice(arrow + 2).trim();
    return {
      ...DECIDED,
      detail: outcome && !EMPTY_OUTCOMES.has(outcome) ? outcome : null,
    };
  }

  // Shape 2: "फैसला (२०६७/०५/२८)" — and "फैसला (००००/००/००)", and a month of
  // 42. A date that cannot be one is dropped rather than printed.
  const paren = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(trimmed);
  if (paren && paren[1].includes("फैसला")) {
    return { ...DECIDED, detail: usableBsDate(paren[2]) };
  }

  if (trimmed.includes("फैसला") || trimmed.includes("अन्तिम आदेश")) {
    return { ...DECIDED, detail: null };
  }

  if (trimmed === "चालु" || trimmed === "चलिरहेको") {
    return { ...PENDING, detail: null };
  }

  return { ...PENDING, detail: trimmed };
}
