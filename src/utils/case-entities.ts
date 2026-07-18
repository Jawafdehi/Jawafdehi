// Helpers for selecting and labelling a case's subject entities.
//
// Not every case type names an "accused" party. CORRUPTION cases do; others
// (e.g. TAX_EVASION) do not. So when we need to name a case's subject(s) we
// prefer the accused entities, but fall back to any other *named* (non-location)
// entity when there are none. Locations are never a subject.

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
 * `name` (the CaseType value) via i18n keys. Every other facet uses its
 * `display_name` when the backend provides one, else a humanized `name` — the
 * unified search service returns bare `{name, count}` facets (no display_name),
 * so the humanized fallback is the normal path there.
 */
export function getFacetItemLabel(
  facetName: string,
  item: { name: string; display_name?: string },
  translate: (key: string) => string,
): string {
  const humanize = (v: string) => v.replaceAll("_", " ").replaceAll("-", " ");
  if (facetName === "case_type") {
    const key = getCaseTypeLabelKey(item.name);
    // Known type → localized label; unknown (e.g. scraped WRIT) → humanized raw
    // value, never a wrong default.
    return key ? translate(key) : humanize(item.name);
  }
  return item.display_name || humanize(item.name);
}
