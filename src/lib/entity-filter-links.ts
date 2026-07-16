/**
 * Drill-down links from the data-quality breakdowns to the unified archive
 * search, filtered to the right record type. The frontend `/entities` route was
 * retired (it redirects to search), so entity browse lives at
 * `/search?type=entity&entity_type=<token>` — the search `entity_type` facet
 * uses the SAME schema tokens as the statistics `by_type` (verified live:
 * "Hospital", "GovernmentOrganization", "EducationalOrganization"...).
 *
 * Only groups whose members map cleanly to a known entity_type token set get a
 * link; ambiguous groups (localGov spans many AdministrativeArea variants,
 * "other" has no clean set) return undefined so those bars stay non-clickable —
 * we link only where the target list actually exists and is browsable.
 */
import type { InstitutionGroupKey } from "./entity-type-labels";

/** Institution group -> the entity_type schema token(s) it covers in search. */
const GROUP_ENTITY_TYPES: Partial<Record<InstitutionGroupKey, string[]>> = {
  hospitals: ["Hospital"],
  government: ["GovernmentOrganization", "Organization,GovernmentOrganization"],
  schools: ["EducationalOrganization"],
  parties: ["Organization,jawafdehi:PoliticalParty"],
  courts: ["Courthouse", "jawafdehi:JudicialBody"],
  places: ["Place"],
  international: ["jawafdehi:InternationalOrganization"],
  orgs: ["Organization", "Organization,Corporation", "Organization,NGO"],
  // localGov (many AdministrativeArea variants) and "other" are intentionally
  // omitted -> non-clickable, to avoid dead-end filters.
};

/** Build an archive-search href for entities of the given entity_type token(s). */
export function entityTypeSearchHref(entityTypes: string[]): string {
  const params = new URLSearchParams();
  params.set("type", "entity");
  for (const et of entityTypes) params.append("entity_type", et);
  return `/search?${params.toString()}`;
}

/**
 * The search href that lists the entities in an institution group, or undefined
 * when the group has no clean entity_type token set (bar stays non-clickable).
 */
export function entityFilterForGroup(group: string): string | undefined {
  const types = GROUP_ENTITY_TYPES[group as InstitutionGroupKey];
  return types ? entityTypeSearchHref(types) : undefined;
}
