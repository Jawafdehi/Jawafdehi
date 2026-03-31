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
import type { Case as JDSCase } from '@/types/jds';

interface UseEntityDetailOptions {
  entityId?: string;
  entityType?: string;
  entitySlug?: string;
  allegedCaseIds?: number[];
  relatedCaseIds?: number[];
}

interface UseEntityDetailReturn {
  entity: Entity | null;
  allegations: PAPAllegation[];
  allegedCases: JDSCase[];
  relatedCases: JDSCase[];
  loading: boolean;
  error: Error | null;
}

export function useEntityDetail(options: UseEntityDetailOptions = {}): UseEntityDetailReturn {
  const { entityId, entityType, entitySlug, allegedCaseIds = [], relatedCaseIds = [] } = options;

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

  const allegedCaseQueries = useQueries({
    queries: allegedCaseIds.map((id) => ({
      queryKey: ['case', id],
      queryFn: () => getCaseById(id),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });

  const relatedCaseQueries = useQueries({
    queries: relatedCaseIds.map((id) => ({
      queryKey: ['case', id],
      queryFn: () => getCaseById(id),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });

  const allegedCases = allegedCaseQueries
    .map((q) => q.data)
    .filter((c): c is JDSCase => c != null);

  const relatedCases = relatedCaseQueries
    .map((q) => q.data)
    .filter((c): c is JDSCase => c != null);

  const loading =
    (!!nesEntityId && entityLoading) ||
    allegedCaseQueries.some((q) => q.isLoading) ||
    relatedCaseQueries.some((q) => q.isLoading);

  return {
    entity,
    allegations: [],
    allegedCases,
    relatedCases,
    loading,
    error: entityError as Error | null,
  };
}
