/**
 * Jawafdehi API (JDS) Client
 *
 * API client for the Jawafdehi accountability platform.
 * Provides read-only access to published cases of accused corruption
 * and misconduct by public entities in Nepal.
 *
 * Reference: Jawafdehi_Public_Accountability_API.yaml
 *
 * Talks to the consolidated monolith via the shared `http` client (auth,
 * base-URL resolution, and error extraction all live in ./http). Cases,
 * sources, statistics, and feedback live under the unified `/api` root.
 */

import { http, extractErrorMessage } from './http';
import { courtRefCandidates } from '@/utils/courtCaseRef';
import type {
  Case,
  CaseDetail,
  CaseSearchParams,
  CaseStatistics,
  PaginatedCaseList,
} from '@/types/jds';

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
  attachment?: File;
}

export interface FeedbackResponse {
  id: number;
  feedbackType: FeedbackType;
  subject: string;
  status: string;
  submittedAt: string;
  message: string;
}

// ============================================================================
// Newsletter Types
// ============================================================================

export interface NewsletterSubscription {
  email: string;
  firstName: string;
  lastName?: string;
  consentAccepted: boolean;
  consentSource: string;
  privacyVersion: string;
  locale?: string;
}

export interface NewsletterSubscriptionResponse {
  id: number;
  email: string;
  status: string;
  message: string;
}

export interface NewsletterUnsubscribeResponse {
  status: string;
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
  const response = (error as { response?: { status?: number; data?: ApiErrorResponse } })
    ?.response;
  const message = extractErrorMessage(
    error,
    error instanceof Error ? error.message : String(error),
  );

  throw new JDSApiError(
    `API Error: ${message}`,
    response?.status,
    endpoint,
    error,
    response?.data?.details,
    response?.data?.retryAfter,
  );
}

// ============================================================================
// Case API Functions
// ============================================================================

/**
 * Retrieve a paginated list of published accountability cases.
 * Only cases with state=PUBLISHED are returned.
 * Results are ordered by creation date (newest first).
 */
export async function getCases(params?: CaseSearchParams): Promise<PaginatedCaseList> {
  try {
    const response = await http.get<PaginatedCaseList>('/api/cases/', {
      params,
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, '/cases/');
  }
}

/**
 * Retrieve detailed information about a specific published case.
 * Includes complete case data and audit history.
 */
export async function getCaseById(id: string | number): Promise<CaseDetail> {
  try {
    const response = await http.get<CaseDetail>(
      `/api/cases/${encodeURIComponent(String(id))}/`,
      { timeout: 10000 },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `/cases/${id}/`);
  }
}

/**
 * Resolve a bare court case number (e.g. "081-CR-0116") to its case by probing
 * the known court identifiers (special:, supreme:). Returns the first match;
 * rethrows the last error if none resolve.
 */
export async function getCaseByCourtRef(ref: string): Promise<CaseDetail> {
  const identifiers = courtRefCandidates(ref);
  let lastError: unknown;
  for (const identifier of identifiers) {
    try {
      return await getCaseById(identifier);
    } catch (error) {
      lastError = error;
      if (error instanceof JDSApiError && error.statusCode === 404) continue;
      throw error;
    }
  }
  throw lastError;
}

/**
 * Filter cases to find those associated with a specific entity ID.
 * Returns all cases where the entity is in the entities array.
 */
export async function getCasesByEntity(entityId: string, params?: CaseSearchParams): Promise<Case[]> {
  try {
    const response = await http.get<PaginatedCaseList>('/api/cases/', {
      params,
      timeout: 10000,
    });

    // Filter cases that include the entity in the unified entities array
    const filteredCases = response.data.results.filter(caseItem =>
      caseItem.entities?.some(e => e.nes_id === entityId)
    );

    return filteredCases;
  } catch (error) {
    handleApiError(error, '/cases/');
  }
}

/**
 * Fetch the published cases that CITE a given entity, by its canonical NES
 * `@id` IRI, using the server-side `?entity=` reverse-lookup filter on
 * /api/cases/. The backend scopes to PUBLISHED for anonymous callers and orders
 * accused/alleged citations first, then reverse-chronologically. Returns the
 * paginated envelope so callers can surface `count` and know if more exist.
 */
export async function getCasesCitingEntity(
  entityIri: string,
  params?: { page_size?: number },
): Promise<PaginatedCaseList> {
  try {
    const response = await http.get<PaginatedCaseList>('/api/cases/', {
      params: { entity: entityIri, ...params },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, '/cases/');
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
    const response = await http.get<CaseStatistics>('/api/statistics/', {
      timeout: 10000,
    });
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
    if (feedback.attachment) {
      // Use multipart/form-data when a file is attached
      const formData = new FormData();
      formData.append('feedbackType', feedback.feedbackType);
      formData.append('subject', feedback.subject);
      formData.append('description', feedback.description);
      if (feedback.relatedPage) formData.append('relatedPage', feedback.relatedPage);
      if (feedback.contactInfo) formData.append('contactInfo', JSON.stringify(feedback.contactInfo));
      formData.append('attachment', feedback.attachment);
      // Let axios derive the multipart Content-Type from the FormData so it
      // includes the required boundary (an explicit header omits it).
      const response = await http.post<FeedbackResponse>('/api/feedback/', formData, {
        timeout: 10000,
      });
      return response.data;
    }
    const response = await http.post<FeedbackResponse>('/api/feedback/', feedback, {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, '/feedback/');
  }
}

// ============================================================================
// Newsletter API Functions
// ============================================================================

/**
 * Subscribe an email address to the Jawafdehi newsletter.
 *
 * @param subscription - Subscriber name and email address
 * @returns Promise<NewsletterSubscriptionResponse> - The created subscription
 * @throws JDSApiError - On validation errors, rate limiting, or server errors
 */
export async function subscribeToNewsletter(
  subscription: NewsletterSubscription,
): Promise<NewsletterSubscriptionResponse> {
  try {
    const response = await http.post<NewsletterSubscriptionResponse>(
      '/api/newsletter/subscriptions/',
      subscription,
      { timeout: 10000 },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, '/newsletter/subscriptions/');
  }
}

/**
 * Unsubscribe a newsletter recipient using their opaque unsubscribe token.
 */
export async function unsubscribeFromNewsletter(
  token: string,
): Promise<NewsletterUnsubscribeResponse> {
  try {
    const response = await http.post<NewsletterUnsubscribeResponse>(
      `/api/newsletter/unsubscribe/${encodeURIComponent(token)}/`,
      {},
      { timeout: 10000 },
    );
    return response.data;
  } catch (error) {
    handleApiError(error, '/newsletter/unsubscribe/');
  }
}

