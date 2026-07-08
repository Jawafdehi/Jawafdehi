/**
 * The entity `by_type` values from /api/statistics/ are internal schema tokens
 * ("GovernmentOrganization", "AdministrativeArea,jawafdehi:RuralMunicipality").
 * A reader recognises "government offices" and "local governments", not those.
 * This maps each token to a human GROUP and rolls the long tail up, so the
 * entity-type chart shows the institutions people actually recognise.
 *
 * Person is deliberately excluded from the grouping: it is ~88% of all entities
 * and is surfaced separately as the headline, so the bar can break down the
 * institutions legibly instead of being one giant "Person" bar.
 */
import type { EntityMetrics } from "@/types/jds";

/** i18n key suffix under dataQuality.entities.group.* */
export type InstitutionGroupKey =
  | "hospitals"
  | "government"
  | "localGov"
  | "schools"
  | "parties"
  | "orgs"
  | "courts"
  | "places"
  | "international"
  | "other";

/**
 * Map a raw `entity_type` token to a human-recognisable group key. Order of
 * checks matters: the more specific token wins (e.g. "GovernmentOrganization"
 * before the generic "Organization"; "PoliticalParty" before "Organization").
 */
function groupKeyFor(entityType: string): InstitutionGroupKey {
  if (!entityType) return "other";
  const t = entityType.toLowerCase();
  if (t.includes("administrativearea")) return "localGov";
  if (t.includes("governmentorganization")) return "government";
  if (t.includes("politicalparty")) return "parties";
  if (t.includes("judicialbody") || t.includes("courthouse")) return "courts";
  if (t.includes("educational")) return "schools";
  if (t.includes("hospital")) return "hospitals";
  if (t.includes("internationalorganization")) return "international";
  if (t.includes("place")) return "places";
  if (t.includes("organization") || t.includes("corporation") || t.includes("ngo"))
    return "orgs";
  return "other";
}

/** The count of individual people (the ~88% headline). */
export function personCount(byType: EntityMetrics["by_type"]): number {
  return byType.find((r) => r.entity_type === "Person")?.count ?? 0;
}

/**
 * Everything that is not a person, rolled up into human groups and sorted by
 * size. Returns group KEYS (resolved to labels via i18n by the caller).
 */
export function institutionGroups(
  byType: EntityMetrics["by_type"],
): { key: InstitutionGroupKey; count: number }[] {
  const totals = new Map<InstitutionGroupKey, number>();
  for (const row of byType) {
    if (row.entity_type === "Person") continue;
    const key = groupKeyFor(row.entity_type);
    totals.set(key, (totals.get(key) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
