/**
 * Jawafdehi API (JDS) Client
 * 
 * API client for the Jawafdehi accountability platform.
 * Provides read-only access to published cases of alleged corruption
 * and misconduct by public entities in Nepal.
 * 
 * Reference: Jawafdehi_Public_Accountability_API.yaml
 * Base URL: https://portal.jawafdehi.org/api
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  Case,
  CaseDetail,
  CaseSearchParams,
  CaseStatistics,
  DocumentSource,
  DocumentSourceSearchParams,
  PaginatedCaseList,
  PaginatedDocumentSourceList,
} from '@/types/jds';
import { normalizeCase, getAllNonLocationEntities as getNormalizedEntities } from '@/utils/caseNormalization';

// ============================================================================
// Feedback Types
// ============================================================================

export type FeedbackType = 'bug' | 'feature' | 'usability' | 'content' | 'general';
export type ContactMethodType = 'email' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'other';

export interface ContactMethod {
  type: ContactMethodType;
  value: string;
}

export interface ContactInfo {
  name?: string;
  contactMethods?: ContactMethod[];
}

export interface FeedbackSubmission {
  feedbackType: FeedbackType;
  subject: string;
  description: string;
  relatedPage?: string;
  contactInfo?: ContactInfo;
}

export interface FeedbackResponse {
  id: number;
  feedbackType: FeedbackType;
  subject: string;
  status: string;
  submittedAt: string;
  message: string;
}

export interface ValidationError {
  [key: string]: string[] | ValidationError;
}

export interface ApiErrorResponse {
  error: string;
  detail?: string;
  details?: ValidationError;
  retryAfter?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const JDS_API_BASE_URL = import.meta.env.VITE_JDS_API_BASE_URL || 'https://portal.jawafdehi.org/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: JDS_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ============================================================================
// Error Handling
// ============================================================================

export class JDSApiError extends Error {
  statusCode?: number;
  endpoint?: string;
  originalError?: unknown;
  validationErrors?: ValidationError;
  retryAfter?: number;

  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    originalError?: unknown,
    validationErrors?: ValidationError,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'JDSApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.originalError = originalError;
    this.validationErrors = validationErrors;
    this.retryAfter = retryAfter;
  }
}

function handleApiError(error: unknown, endpoint: string): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const statusCode = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    // Extract error details
    const message = responseData?.error || responseData?.detail || axiosError.message;
    const validationErrors = responseData?.details;
    const retryAfter = responseData?.retryAfter;

    throw new JDSApiError(
      `API Error: ${message}`,
      statusCode,
      endpoint,
      error,
      validationErrors,
      retryAfter
    );
  }

  throw new JDSApiError(
    `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    undefined,
    endpoint,
    error
  );
}

// ============================================================================
// Case API Functions
// ============================================================================

/**
 * Retrieve a paginated list of published accountability cases.
 * Only cases with state=PUBLISHED are returned.
 * Results are ordered by creation date (newest first).
 * Cases are normalized to ensure consistent unified entities format.
 */
export async function getCases(params?: CaseSearchParams): Promise<PaginatedCaseList> {
  try {
    const response = await apiClient.get<PaginatedCaseList>('/cases/', {
      params,
    });
    
    // Normalize all cases to ensure consistent format
    const normalizedResults = response.data.results.map(normalizeCase);
    
    return {
      ...response.data,
      results: normalizedResults,
    };
  } catch (error) {
    handleApiError(error, '/cases/');
  }
}

/**
 * Retrieve detailed information about a specific published case.
 * Includes complete case data and audit history.
 * Case data is normalized to ensure consistent unified entities format.
 */
export async function getCaseById(id: number): Promise<CaseDetail> {
  try {
    const response = await apiClient.get<CaseDetail>(`/cases/${id}/`);
    
    // Normalize case to ensure consistent format
    return normalizeCase(response.data);
  } catch (error) {
    handleApiError(error, `/cases/${id}/`);
  }
}

/**
 * Filter cases to find those associated with a specific entity ID.
 * Returns all cases where the entity is in the unified entities array or legacy fields.
 * Supports both unified format (entities with type field) and legacy format.
 * Cases are normalized to ensure consistent unified entities format.
 */
export async function getCasesByEntity(entityId: string, params?: CaseSearchParams): Promise<Case[]> {
  try {
    const response = await apiClient.get<PaginatedCaseList>('/cases/', {
      params,
    });
    
    // Normalize all cases first to ensure consistent format
    const normalizedCases = response.data.results.map(normalizeCase);
    
    // Filter cases that include the entity using normalized data
    const filteredCases = normalizedCases.filter(caseItem => {
      // Use normalized entities array for consistent searching
      const allEntities = getNormalizedEntities(caseItem);
      return allEntities.some(e => e.nes_id === entityId);
    });
    
    return filteredCases;
  } catch (error) {
    handleApiError(error, '/cases/');
  }
}

/**
 * Get a Jawaf entity by its database ID.
 * Searches through cases to find the entity with the matching ID.
 * Uses normalized case data to ensure consistent entity searching across formats.
 */
export async function getJawafEntityById(entityId: number): Promise<import('@/types/jds').JawafEntity | null> {
  try {
    const response = await apiClient.get<PaginatedCaseList>('/cases/');
    
    // Normalize all cases first to ensure consistent format
    const normalizedCases = response.data.results.map(normalizeCase);
    
    // Search through all normalized cases to find the entity
    for (const caseItem of normalizedCases) {
      // Search in normalized entities array
      const allEntities = getNormalizedEntities(caseItem);
      const foundEntity = allEntities.find(e => e.id === entityId);
      if (foundEntity) return foundEntity;
      
      // Also check location entities
      if (caseItem.locations) {
        const locationEntity = caseItem.locations.find(e => e.id === entityId);
        if (locationEntity) return locationEntity;
      }
    }
    
    return null;
  } catch (error) {
    handleApiError(error, '/cases/');
  }
}

// ============================================================================
// Document Source API Functions
// ============================================================================

/**
 * Retrieve a paginated list of document sources.
 * Only sources associated with published cases are accessible.
 */
export async function getDocumentSources(params?: DocumentSourceSearchParams): Promise<PaginatedDocumentSourceList> {
  try {
    const response = await apiClient.get<PaginatedDocumentSourceList>('/sources/', {
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, '/sources/');
  }
}

/**
 * Retrieve detailed information about a specific document source.
 */
export async function getDocumentSourceById(id: number): Promise<DocumentSource> {
  try {
    const response = await apiClient.get<DocumentSource>(`/sources/${id}/`);
    return response.data;
  } catch (error) {
    handleApiError(error, `/sources/${id}/`);
  }
}

// ============================================================================
// Statistics API Functions
// ============================================================================

/**
 * Retrieve aggregate statistics for the platform.
 * Returns counts of published cases, entities tracked, cases under investigation, and closed cases.
 * Statistics are cached for 5 minutes on the server side.
 */
export async function getStatistics(): Promise<CaseStatistics> {
  try {
    const response = await apiClient.get<CaseStatistics>('/statistics/');
    return response.data;
  } catch (error) {
    handleApiError(error, '/statistics/');
  }
}

// ============================================================================
// Feedback API Functions
// ============================================================================

/**
 * Submit platform feedback.
 * 
 * Allows users to submit feedback about the platform including bug reports,
 * feature requests, usability issues, content feedback, and general comments.
 * 
 * Rate Limit: 5 submissions per IP per hour
 * 
 * @param feedback - The feedback submission data
 * @returns Promise<FeedbackResponse> - The created feedback with ID and status
 * @throws JDSApiError - On validation errors, rate limiting, or server errors
 * 
 * @example
 * ```typescript
 * const feedback = await submitFeedback({
 *   feedbackType: 'bug',
 *   subject: 'Search not working',
 *   description: 'When I search for cases, nothing happens',
 *   relatedPage: 'Cases page',
 *   contactInfo: {
 *     name: 'राम बहादुर',
 *     contactMethods: [
 *       { type: 'email', value: 'ram@example.com' }
 *     ]
 *   }
 * });
 * ```
 */
export async function submitFeedback(feedback: FeedbackSubmission): Promise<FeedbackResponse> {
  try {
    const response = await apiClient.post<FeedbackResponse>('/feedback/', feedback);
    return response.data;
  } catch (error) {
    handleApiError(error, '/feedback/');
  }
}

// ============================================================================
// Entity Utility Functions
// ============================================================================

/**
 * Filter entities by relationship type from unified entities array.
 * Supports filtering by type (alleged, related, witness, etc.)
 * @deprecated Use getEntitiesByType from @/utils/caseNormalization instead
 */
export function filterEntitiesByType(entities: import('@/types/jds').JawafEntity[], type: import('@/types/jds').EntityRelationshipType): import('@/types/jds').JawafEntity[] {
  return entities.filter(entity => entity.type === type);
}

/**
 * Get alleged entities from a case, supporting both unified and legacy formats.
 * @deprecated Use getAllegedEntities from @/utils/caseNormalization instead
 */
export function getAllegedEntities(caseItem: import('@/types/jds').Case): import('@/types/jds').JawafEntity[] {
  const normalizedCase = normalizeCase(caseItem);
  return normalizedCase.entities.filter(entity => entity.type === 'alleged');
}

/**
 * Get related entities from a case, supporting both unified and legacy formats.
 * @deprecated Use getRelatedEntities from @/utils/caseNormalization instead
 */
export function getRelatedEntities(caseItem: import('@/types/jds').Case): import('@/types/jds').JawafEntity[] {
  const normalizedCase = normalizeCase(caseItem);
  return normalizedCase.entities.filter(entity => entity.type === 'related');
}

/**
 * Get all non-location entities from a case, supporting both unified and legacy formats.
 * @deprecated Use getAllNonLocationEntities from @/utils/caseNormalization instead
 */
export function getAllNonLocationEntities(caseItem: import('@/types/jds').Case): import('@/types/jds').JawafEntity[] {
  const normalizedCase = normalizeCase(caseItem);
  return normalizedCase.entities;
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/**
 * @deprecated Use getCases instead
 */
export const getAllegations = getCases;

/**
 * @deprecated Use getCaseById instead
 */
export const getAllegationById = getCaseById;

/**
 * @deprecated Use getCasesByEntity instead
 */
export const getAllegationsByEntity = getCasesByEntity;
