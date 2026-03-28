/**
 * Nepal Entity Service (NES) API Client
 *
 * This module provides typed API functions to interact with the NES backend.
 *
 * References:
 * - Backend types: https://github.com/NewNepal-org/NepalEntityService-Tundikhel/blob/main/src/common/nes-types.ts
 * - Live reference: https://tundikhel.nes.newnepal.org
 * - Core NES: https://github.com/NewNepal-org/NepalEntityService
 *
 * Environment Variables:
 * - VITE_NES_API_BASE_URL: Base URL for the NES API (default: https://nes.newnepal.org/api)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getCasesByEntity } from '@/services/jds-api';
import type {
  Person,
  Organization,
  Location,
  Entity,
  Relationship,
  VersionSummary
} from '@/types/nes';

// ============================================================================
// API Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_NES_API_BASE_URL || 'https://nes.newnepal.org/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ============================================================================
// Response Types
// ============================================================================

export interface EntityListResponse {
  entities: Entity[];
  total?: number;
  page?: number;
  limit?: number;
  has_more?: boolean;
}

export interface RelationshipListResponse {
  relationships: Relationship[];
  total?: number;
}

export interface VersionListResponse {
  versions: VersionSummary[];
  entity_id: string;
}

// ============================================================================
// Search & Filter Parameters
// ============================================================================

export interface EntitySearchParams {
  query?: string;       // Search query
  entity_type?: string; // Entity type: person, organization, location
  sub_type?: string;    // Entity subtype
  attributes?: Record<string, unknown>; // Filter by attributes (JSON object)
  limit?: number;       // Maximum number of results (default: 100, max: 1000)
  offset?: number;      // Number of results to skip (default: 0)
  entity_ids?: string[]; // Filter by specific entity IDs (for batch retrieval)
}

export interface RelationshipSearchParams {
  source_id?: string;   // Source entity ID
  target_id?: string;   // Target entity ID
  type?: string;        // Relationship type
  limit?: number;       // Maximum number of results
  offset?: number;      // Number of results to skip
}

// ============================================================================
// PAP-Specific Types (Not part of NES core)
// ============================================================================

export interface Allegation {
  id: string;
  entity_id: string;
  title: string;
  status: string;
  severity: string;
  summary: string;
  evidence?: string[];
  date: string;
}

export interface Case {
  id: string;
  entity_id: string;
  name: string;
  description: string;
  documents?: string[];
  timeline?: TimelineEvent[];
  status: string;
  state?: import('@/types/jds').CaseState; // Workflow state from JDS
}

export interface TimelineEvent {
  date: string;
  event: string;
  description?: string;
}

// ============================================================================
// Error Handling
// ============================================================================

export class NESApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NESApiError';
  }
}

function handleApiError(error: unknown, endpoint: string): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status;
    const responseData = axiosError.response?.data as Record<string, unknown> | undefined;
    const message = (responseData?.detail as string) || axiosError.message;

    throw new NESApiError(
      `API request failed: ${message}`,
      statusCode,
      endpoint,
      error
    );
  }

  throw new NESApiError(
    'Unknown error occurred',
    undefined,
    endpoint,
    error instanceof Error ? error : undefined
  );
}

// ============================================================================
// Entity Endpoints
// ============================================================================

/**
 * Get list of entities with optional filters
 *
 * Backend endpoint: GET /entities?query={query}&entity_type={type}&limit={limit}&offset={offset}
 *
 * @param params - Search and filter parameters
 * @returns Promise<EntityListResponse>
 *
 * @example
 * ```typescript
 * // List all entities
 * const all = await getEntities();
 *
 * // Search for entities
 * const results = await getEntities({ query: 'poudel', entity_type: 'person', limit: 10 });
 *
 * // Filter by type and subtype
 * const parties = await getEntities({
 *   entity_type: 'organization',
 *   sub_type: 'political_party'
 * });
 * ```
 */
export async function getEntities(params?: EntitySearchParams): Promise<EntityListResponse> {
  try {
    const queryParams: Record<string, string | number> = {};

    if (params?.query) queryParams.query = params.query;
    if (params?.entity_type) queryParams.entity_type = params.entity_type;
    if (params?.sub_type) queryParams.sub_type = params.sub_type;
    if (params?.attributes) queryParams.attributes = JSON.stringify(params.attributes);
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.offset !== undefined) queryParams.offset = params.offset;

    // Handle entity_ids for batch retrieval
    if (params?.entity_ids && params.entity_ids.length > 0) {
      queryParams['entity-id'] = params.entity_ids.join(',');
    }

    const response = await api.get<EntityListResponse>('/entities', {
      params: queryParams
    });
    return response.data;
  } catch (error) {
    handleApiError(error, '/entities');
  }
}

/**
 * Search entities using query string (convenience wrapper around getEntities)
 *
 * @param query - Search query string
 * @param params - Additional filter parameters
 * @returns Promise<EntityListResponse>
 *
 * @example
 * ```typescript
 * // Search for entities named "Ram"
 * const results = await searchEntities('ram', { entity_type: 'person', limit: 10 });
 * ```
 */
export async function searchEntities(
  query: string,
  params?: Omit<EntitySearchParams, 'query'>
): Promise<EntityListResponse> {
  return getEntities({
    query,
    ...params
  });
}

/**
 * Get single entity by ID or slug
 *
 * Backend endpoint: GET /entities/{id}
 *
 * @param idOrSlug - Entity ID (e.g., 'entity:person/prabin-shahi') or slug
 * @returns Promise<Entity>
 *
 * @example
 * ```typescript
 * // Using NES entity ID format
 * const entity = await getEntityById('entity:person/prabin-shahi');
 * // Using simple slug
 * const entity2 = await getEntityById('pushpa-kamal-dahal-prachanda');
 * ```
 */
export async function getEntityById(idOrSlug: string): Promise<Entity> {
  try {
    // URL-encode the entity ID to handle NES format (entity:type/slug)
    const encodedId = encodeURIComponent(idOrSlug);
    const response = await api.get<Entity>(`/entities/${encodedId}`);
    return response.data;
  } catch (error) {
    const encodedId = encodeURIComponent(idOrSlug);
    handleApiError(error, `/entities/${encodedId}`);
  }
}

/**
 * Get single entity by slug (alias for getEntityById)
 *
 * @param slug - Entity slug
 * @returns Promise<Entity>
 */
export async function getEntityBySlug(slug: string): Promise<Entity> {
  return getEntityById(slug);
}

/**
 * Get version history for an entity
 *
 * Backend endpoint: GET /entities/{id}/versions
 *
 * @param idOrSlug - Entity ID (e.g., 'entity:person/prabin-shahi') or slug
 * @returns Promise<VersionListResponse>
 *
 * @example
 * ```typescript
 * const versions = await getEntityVersions('entity:person/prabin-shahi');
 * ```
 */
export async function getEntityVersions(idOrSlug: string): Promise<VersionListResponse> {
  try {
    // URL-encode the entity ID to handle NES format (entity:type/slug)
    const encodedId = encodeURIComponent(idOrSlug);
    const response = await api.get<VersionListResponse>(`/entities/${encodedId}/versions`);
    return response.data;
  } catch (error) {
    console.warn(`Version history not available for entity ${idOrSlug}`);
    return { versions: [], entity_id: idOrSlug };
  }
}

// ============================================================================
// Relationship Endpoints
// ============================================================================

/**
 * Get relationships with optional filters
 *
 * Backend endpoint: GET /relationships?source_id={id}&target_id={id}&type={type}
 *
 * @param params - Relationship search parameters
 * @returns Promise<RelationshipListResponse>
 *
 * @example
 * ```typescript
 * // Get all relationships where entity is the source
 * const rels = await getRelationships({ source_id: 'entity-slug' });
 *
 * // Get all relationships where entity is the target
 * const rels = await getRelationships({ target_id: 'entity-slug' });
 * ```
 */
export async function getRelationships(
  params?: RelationshipSearchParams
): Promise<RelationshipListResponse> {
  try {
    const response = await api.get<RelationshipListResponse>('/relationships', { params });
    return response.data;
  } catch (error) {
    console.warn('Relationships endpoint returned error, returning empty list');
    return { relationships: [] };
  }
}

// ============================================================================
// Allegation & Case API Functions
// ============================================================================
// Note: NES API provides entity data only. Allegations and cases will be
// handled by a separate API (Jawafdehi) to be integrated later.
//
// These functions are currently not implemented and return empty arrays.

/**
 * Get allegations for an entity
 *
 * @param idOrSlug - Entity ID (e.g., 'entity:person/prabin-shahi') or slug
 * @returns Promise<Allegation[]> - Allegations from JDS API mapped to PAP format
 */
export async function getEntityAllegations(idOrSlug: string): Promise<Allegation[]> {
  try {
    // URL-encode the entity ID for JDS API query
    const jdsCases = await getCasesByEntity(idOrSlug);

    // Map JDS cases to PAP Allegation format
    return jdsCases.map(jdsCase => ({
      id: jdsCase.id.toString(),
      entity_id: idOrSlug,
      title: jdsCase.title,
      status: 'ongoing', // Cases are published cases
      severity: jdsCase.case_type, // Map type to severity
      summary: jdsCase.key_allegations.join('; '),
      evidence: jdsCase.evidence.map(e => e.description),
      date: jdsCase.created_at,
    }));
  } catch (error) {
    console.warn(`Allegations not available from JDS API (entity: ${idOrSlug})`);
    return [];
  }
}

/**
 * Get cases for an entity
 *
 * @param idOrSlug - Entity ID or slug
 * @returns Promise<Case[]> - Cases from JDS API (mapped from allegations)
 */
export async function getEntityCases(idOrSlug: string): Promise<Case[]> {
  try {
    const cases = await getCasesByEntity(idOrSlug);

    // Map JDS cases to PAP Case format
    return cases.map(c => ({
      id: c.id.toString(),
      entity_id: idOrSlug,
      name: c.title,
      description: c.description,
      documents: c.evidence.map(e => e.source_id.toString()),
      timeline: c.timeline.map(t => ({
        date: t.event_date,
        event: t.title,
        description: t.description
      })),
      status: 'ongoing', // Published cases
      state: c.state, // Propagate workflow state from JDS
    }));
  } catch (error) {
    console.warn(`Cases not available from JDS API (entity: ${idOrSlug})`);
    return [];
  }
}

/**
 * Get entity IDs associated with cases
 *
 * This function retrieves all cases and extracts unique entity IDs
 * from the unified entities field.
 *
 * Returns a list of entity IDs that have associated cases.
 *
 * @returns Promise<string[]> - Array of entity IDs
 */
export async function getEntityIdsWithCases(): Promise<string[]> {
  try {
    const { getCases } = await import('@/services/jds-api');
    console.log('Fetching cases from JDS API...');
    const casesResponse = await getCases({ page: 1 });
    console.log('Cases response:', casesResponse);
    console.log('Number of cases:', casesResponse.results?.length || 0);

    // Extract all entity IDs from cases
    const entityIds = new Set<string>();

    if (casesResponse.results && casesResponse.results.length > 0) {
      casesResponse.results.forEach((caseItem, index) => {
        console.log(`Case ${index + 1}:`, {
          id: caseItem.id,
          title: caseItem.title,
          entities: caseItem.entities?.length || 0
        });

        // Add all entities from unified entities array
        caseItem.entities?.forEach(entity => {
          if (entity.nes_id) {
            console.log(`  Adding entity (${entity.type}): ${entity.nes_id}`);
            entityIds.add(entity.nes_id);
          } else {
            console.log(`  Skipping entity without nes_id:`, entity);
          }
        });
      });
    } else {
      console.warn('No cases found in response');
    }

    const entityIdsArray = Array.from(entityIds);
    console.log(`Total unique entity IDs with cases: ${entityIdsArray.length}`, entityIdsArray);
    return entityIdsArray;
  } catch (error) {
    console.error('Failed to fetch entity IDs with cases:', error);
    return [];
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check API health
 *
 * @returns Promise<{ status: string }>
 */
export async function healthCheck(): Promise<{ status: string }> {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    handleApiError(error, '/health');
  }
}

// ============================================================================
// Exports
// ============================================================================

export default api;

// Re-export types for convenience
export type {
  Person,
  Organization,
  Location,
  Entity,
  Relationship,
  VersionSummary
} from '@/types/nes';
