import { getCasesCitingCourtCase, getCasesCitingEntity } from "@/services/jds-api";

/**
 * The "related cases" queries of the entity and court-case pages, shared by the
 * components that render them and the SSR prefetch (entry-server.tsx), so the
 * server fills exactly the key the page reads. A hand-copied key drifted once
 * already (#440 → every /cases page served as a skeleton).
 *
 * These lists are the only links from an entity or court-case page to the case
 * pages that cite it, which is why they are server-rendered at all.
 */
export const ENTITY_RELATED_CASES_PAGE_SIZE = 50;
export const COURTCASE_RELATED_CASES_PAGE_SIZE = 20;

export function entityRelatedCasesQuery(entityIri: string) {
  return {
    queryKey: ["entity-related-cases", entityIri] as const,
    queryFn: () => getCasesCitingEntity(entityIri, { page_size: ENTITY_RELATED_CASES_PAGE_SIZE }),
  };
}

export function courtCaseRelatedCasesQuery(courtCaseIri: string) {
  return {
    queryKey: ["courtcase-related-cases", courtCaseIri] as const,
    queryFn: () => getCasesCitingCourtCase(courtCaseIri, { page_size: COURTCASE_RELATED_CASES_PAGE_SIZE }),
  };
}

/**
 * The canonical court-case @id: court and case number lowercased, matching the
 * backend's build_courtcase_iri. Shared by CourtCaseProfile and the SSR
 * prefetch so both key the related-cases query on the same IRI.
 */
export function courtCaseIri(court: string, caseNumber: string): string {
  return `https://jawafdehi.org/courtcase/${court.toLowerCase()}/${caseNumber.toLowerCase()}`;
}
