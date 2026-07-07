// Casework Review System API calls. Uses the ONE unified client (http.ts):
// same monolith origin, same auth (OIDC bearer or dev-auth session). Endpoints
// live under /api/casework/ on the monolith.
import type {
  ReviewListItem,
  ReviewDetail,
  CaseworkRule,
  ReviewConfig,
  Paginated,
  GroupedCase,
} from "@/types/casework";
import { http as client, extractErrorMessage } from "./http";

/** @deprecated import `extractErrorMessage` from services/http directly. */
export const apiErrorMessage = extractErrorMessage;

const CASEWORK = "/api/casework";

// ---- Reviews ----

export interface SubmitReviewPayload {
  slug?: string;
  court_case_number?: string;
}

// A court case ref is "<court>:<case_number>" (e.g. "special:081-CR-0079"):
// lowercase-alnum court id, then a hyphen/alnum case number, no slashes/scheme.
const COURT_REF_RE = /^[a-z0-9]+:[A-Za-z0-9-]+$/;

// Classify free-text input from the submit box into the right field. A court
// case ref goes to `court_case_number`; everything else (a bare slug or a full
// case URL like https://jawafdehi.org/case/<slug>) goes to `slug`, which the
// backend normalizes (it extracts the slug from a URL).
export function buildSubmitPayload(raw: string): SubmitReviewPayload {
  const value = raw.trim();
  return COURT_REF_RE.test(value) ? { court_case_number: value } : { slug: value };
}

export async function listReviews(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<ReviewListItem>> {
  const { data } = await client.get<Paginated<ReviewListItem> | ReviewListItem[]>(`${CASEWORK}/reviews/`, {
    params,
  });
  // Tolerate a non-paginated (plain array) response during rollout.
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  // Defensively default each field so a malformed envelope can't crash callers
  // that iterate `results` (e.g. mergeReviews).
  return {
    count: data?.count ?? 0,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results: data?.results ?? [],
  };
}

// Reviews grouped by case, paginated BY CASE: each entry carries ALL of a
// case's executions (so older runs that would fall on a later page of the flat
// list still show under their case). Used by the review list page.
export async function listReviewsGrouped(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<GroupedCase>> {
  const { data } = await client.get<Paginated<GroupedCase> | GroupedCase[]>(`${CASEWORK}/reviews/grouped/`, {
    params,
  });
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return {
    count: data?.count ?? 0,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results: data?.results ?? [],
  };
}

export async function getReview(id: number): Promise<ReviewDetail> {
  const { data } = await client.get<ReviewDetail>(`${CASEWORK}/reviews/${id}/`);
  return data;
}

export async function submitReview(payload: SubmitReviewPayload): Promise<ReviewDetail> {
  const { data } = await client.post<ReviewDetail>(`${CASEWORK}/reviews/submit/`, payload);
  return data;
}

export async function regradeAll(): Promise<{ regrading: number; review_ids: number[] }> {
  const { data } = await client.post(`${CASEWORK}/reviews/regrade-all/`);
  return data;
}

// ---- Rules (code-enforced, read-only) ----

export async function listRules(): Promise<CaseworkRule[]> {
  const { data } = await client.get<CaseworkRule[]>(`${CASEWORK}/rules/`);
  return data;
}

// ---- Config ----

export async function getConfig(): Promise<ReviewConfig> {
  const { data } = await client.get<ReviewConfig>(`${CASEWORK}/config/`);
  return data;
}

export async function updateConfig(payload: Partial<ReviewConfig>): Promise<ReviewConfig> {
  const { data } = await client.put<ReviewConfig>(`${CASEWORK}/config/`, payload);
  return data;
}
