/**
 * useEntityDetail Hook
 *
 * Fetch comprehensive entity details including profile, alleged cases, and related cases.
 * Uses React Query for SSR-compatible data fetching.
 */

import { useQueries, useQuery } from '@tanstack/react-query';
import { getEntityById, type Allegation as PAPAllegation } from '@/services/api';
import { getCaseById } from '@/services/jds-api';
import type { Entity } from '@/types/nes';
import type { Case as JDSCase, EntityCaseRelationship } from '@/types/jds';

interface UseEntityDetailOptions {
  entityId?: string;
  entityType?: string;
  entitySlug?: string;
  relatedCaseEntries?: EntityCaseRelationship[];
}

export interface EntityCaseWithRelation {
  caseItem: JDSCase;
  relationType: string;
  notes: string;
}

interface UseEntityDetailReturn {
  entity: Entity | null;
  allegations: PAPAllegation[];
  relatedCaseDetails: EntityCaseWithRelation[];
  loading: boolean;
  error: Error | null;
}

export function useEntityDetail(options: UseEntityDetailOptions = {}): UseEntityDetailReturn {
  const { entityId, entityType, entitySlug, relatedCaseEntries = [] } = options;

  // Resolve the NES entity ID
  const nesEntityId = entityType && entitySlug
    ? `entity:${entityType}/${entitySlug}`
    : entityId;

  const { data: entity = null, isLoading: entityLoading, error: entityError } = useQuery({
    queryKey: ['nes-entity', nesEntityId],
    queryFn: () => getEntityById(nesEntityId!),
    enabled: !!nesEntityId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const uniqueCaseIds = [...new Set(relatedCaseEntries.map((entry) => entry.case_id))];

  const relatedCaseQueries = useQueries({
    queries: uniqueCaseIds.map((id) => ({
      queryKey: ['case', id],
      queryFn: () => getCaseById(id),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });

  const fetchedCases = relatedCaseQueries
    .map((q) => q.data)
    .filter((c): c is JDSCase => c != null);

  const caseMap = new Map<number, JDSCase>(fetchedCases.map((caseItem) => [caseItem.id, caseItem]));

  const relatedCaseDetails = relatedCaseEntries
    .map((entry) => {
      const caseItem = caseMap.get(entry.case_id);
      if (!caseItem) {
        return null;
      }
      return {
        caseItem,
        relationType: entry.relation_type,
        notes: entry.notes,
      };
    })
    .filter((entry): entry is EntityCaseWithRelation => entry !== null);

  const loading =
    (!!nesEntityId && entityLoading) ||
    relatedCaseQueries.some((q) => q.isLoading);

  return {
    entity,
    allegations: [],
    relatedCaseDetails,
    loading,
    error: entityError as Error | null,
  };
}
