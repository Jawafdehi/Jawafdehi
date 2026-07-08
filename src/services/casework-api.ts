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
  // Caseworkers submit an `iri`: a Jawafdehi case IRI
  // (https://jawafdehi.org/case/<slug>) or a court-case IRI
  // (https://jawafdehi.org/courtcase/<court>/<case-number>). The backend
  // resolves it to the case's canonical slug.
  iri?: string;
  // `slug` is used only by the internal re-run / regrade path, which already
  // holds the resolved canonical slug.
  slug?: string;
}

// A submitted IRI is either a Jawafdehi case IRI or a court-case IRI. The
// backend is the authority (it resolves + validates against the DB); this is a
// lenient client-side shape check so the form can flag obviously-wrong input
// (a bare case number, a name) before a round-trip.
const REVIEW_IRI_RE =
  /^https?:\/\/[^/]+\/(?:case\/[a-zA-Z][a-zA-Z0-9-]*|courtcase\/[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9._-]*)$/;

export function looksLikeReviewIri(raw: string): boolean {
  return REVIEW_IRI_RE.test(raw.trim());
}

// The submit box demands an IRI (a Jawafdehi case IRI or a court-case IRI).
// Send it verbatim as `iri`; the backend resolves it to the canonical case slug
// and returns a clear 400 if it names no case.
export function buildSubmitPayload(raw: string): SubmitReviewPayload {
  return { iri: raw.trim() };
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
