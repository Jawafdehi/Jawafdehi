/**
 * useEntityList Hook
 * 
 * Fetch and manage entity list with search, filtering, and pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { getEntities, searchEntities, EntitySearchParams, EntityListResponse } from '@/services/api';
import type { Entity } from '@/types/nes';

interface UseEntityListOptions {
  query?: string;
  page?: number;
  limit?: number;
  entity_type?: string;
  sub_type?: string;
  autoFetch?: boolean;
}

interface UseEntityListReturn {
  entities: Entity[];
  loading: boolean;
  error: Error | null;
  total: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
}

export function useEntityList(options: UseEntityListOptions = {}): UseEntityListReturn {
  const {
    query,
    page = 1,
    limit = 100,
    entity_type,
    sub_type,
    autoFetch = true
  } = options;

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: EntitySearchParams = {
        limit,
        offset: (page - 1) * limit,
        entity_type,
        sub_type,
      };

      let response: EntityListResponse;

      if (query && query.trim()) {
        response = await searchEntities(query, params);
      } else {
        response = await getEntities(params);
      }

      setEntities(response.entities || []);
      setTotal(response.total || response.entities.length);
      setHasMore(response.has_more || false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch entities');
      setError(error);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }, [query, page, limit, entity_type, sub_type]);

  useEffect(() => {
    if (autoFetch) {
      fetchEntities();
    }
  }, [fetchEntities, autoFetch]);

  return {
    entities,
    loading,
    error,
    total,
    hasMore,
    refetch: fetchEntities,
  };
}
