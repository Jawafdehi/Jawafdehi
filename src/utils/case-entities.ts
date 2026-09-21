// Helpers for selecting and labelling a case's subject entities.
//
// Not every case type names an "accused" party. CORRUPTION cases do; others
// (e.g. TAX_EVASION) do not. So when we need to name a case's subject(s) we
// prefer the accused entities, but fall back to any other *named* (non-location)
// entity when there are none. Locations are never a subject.

import { materialTypeKeyFor } from "@/lib/material-type-labels";
import { formatCourtName, formatCourtType } from "@/utils/court-case-format";

const LOCATION_ROLE = "location";
const ACCUSED_ROLE = "accused";

/**
 * Return the entities that name a case's subject.
 *
 * Prefers accused entities; when there are none (e.g. a TAX_EVASION case) falls
 * back to every other entity that has a defined, non-location role. Entities
 * with a missing/empty role are never treated as a subject.
 *
 * @param entities  the case's entities (any shape)
 * @param getRole   extracts the relationship role from one entity
 */
export function getSubjectEntities<T>(
  entities: readonly T[] | null | undefined,
  getRole: (entity: T) => string | null | undefined,
): T[] {
  const list = entities ?? [];
  const accused = list.filter((e) => getRole(e) === ACCUSED_ROLE);
  if (accused.length > 0) return accused;
  return list.filter((e) => {
    const role = getRole(e);
    return Boolean(role) && role !== LOCATION_ROLE;
  });
}

// i18n keys for each case type's display label, keyed by the backend CaseType
// value. Single source of truth so every display site stays consistent.
const CASE_TYPE_LABEL_KEYS: Record<string, string> = {
  CORRUPTION: "cases.type.corruption",
  BRIBERY: "cases.type.bribery",
  FORGERY: "cases.type.forgery",
  EMBEZZLEMENT: "cases.type.embezzlement",
  ABUSE_OF_OFFICE: "cases.type.abuseOfOffice",
  MONEY_LAUNDERING: "cases.type.moneyLaundering",
  ILLEGAL_PROPERTY: "cases.type.illegalProperty",
  EXAM_RIGGING: "cases.type.examRigging",
  TAX_EVASION: "cases.type.taxEvasion",
  BANKING_OFFENCE: "cases.type.bankingOffence",
};

/**
 * i18n key for a case type's display label, or `null` when the type is unknown.
 *
 * Lookup is case-INSENSITIVE: court-case types arrive from external scrapers with
 * inconsistent casing (e.g. "CORRUPTION" vs "Corruption"), and a case-sensitive
 * match would (a) fragment facets into duplicate buckets and (b) fall through to a
 * default. Returns `null` for genuinely unknown types so callers can humanize the
 * raw value instead of mislabelling it (e.g. a WRIT must NOT render as "corruption").
 */
export function getCaseTypeLabelKey(
  caseType: string | null | undefined,
): string | null {
  if (!caseType) return null;
  return CASE_TYPE_LABEL_KEYS[caseType.toUpperCase()] ?? null;
}

/**
 * Display label for a search facet item.
 *
 * `case_type` facets are localized to the viewer's language from their stable
 * `name` (the CaseType value) via i18n keys. The court facets are named by the
 * shared `court-case-format` helpers, so a court is spelled the same way in the
 * sidebar as on the card it filters to. Every other facet uses its
 * `display_name` when the backend provides one, else a humanized `name` — the
 * unified search service returns bare `{name, count}` facets (no display_name),
 * so the humanized fallback is the normal path there.
 *
 * `language` is what selects the Nepali court names; it defaults to English for
 * the non-court callers that have no reason to pass one.
 */
export function getFacetItemLabel(
  facetName: string,
  item: { name: string; display_name?: string },
  translate: (key: string, fallback?: string) => string,
  language = "en",
): string {
  const humanize = (v: string) => v.replaceAll("_", " ").replaceAll("-", " ");
  if (facetName === "case_type") {
    const key = getCaseTypeLabelKey(item.name);
    // Known type → localized label; unknown (e.g. scraped WRIT) → humanized raw
    // value, never a wrong default.
    return key ? translate(key) : humanize(item.name);
  }
  // Material document form. The tokens are lower_snake_case ("charge_sheet",
  // "procurement_notice") and already carry bilingual labels under
  // dataQuality.materialsByType.type.* — the same ones the /materials chart and
  // the search result card read, so one thing gets one name across three
  // surfaces. Without this branch the fallback humanizes them into English
  // ("charge sheet") on a Nepali-first site.
  //
  // An unknown token resolves to "other", which would be a WRONG label rather
  // than merely an ugly one, so it falls through to the humanized value — the
  // same call `case_type` makes just above.
  if (facetName === "material_type") {
    const key = materialTypeKeyFor(item.name);
    return key === "other"
      ? humanize(item.name)
      : translate(`dataQuality.materialsByType.type.${key}`);
  }
  // Court tier ("district") and court identifier ("kathmandudc") are different
  // vocabularies over the same names, so they take the two matching helpers.
  if (facetName === "court_type") return formatCourtType(item.name, language);
  if (facetName === "court") return formatCourtName(item.name, language);
  // `NATIONAL` is NOT a province: the API uses it as the sentinel for the two
  // courts with country-wide jurisdiction (supreme + special), and it is the
  // LARGEST bucket in this facet — ~44% of the court corpus. Reshaping it into
  // "National" would file a sentinel among the seven real provinces, so it gets
  // a label that says what it selects. Every other bucket already arrives as a
  // canonical title-case English province name and needs no reshaping.
  if (facetName === "province" && item.name === "NATIONAL") {
    return translate(
      "archiveSearch.filters.provinceNational",
      "National jurisdiction",
    );
  }
  return item.display_name || humanize(item.name);
}
