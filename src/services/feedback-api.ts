// Staff feedback queue. Uses the ONE unified client (http.ts): same monolith
// origin, same auth (OIDC bearer or dev-auth session).
//
// NOTE the path. `/api/feedback/` is the PUBLIC, unauthenticated submission
// endpoint (see submitFeedback in jds-api.ts) and is write-only — a GET there
// is a 405, not a listing. The staff read/triage surface is a separate route
// because the public one runs with authentication disabled so an anonymous
// reporter can always post. Don't "simplify" these onto one path.
import { http as client } from "./http";
import type { Paginated } from "./admin-api";
import type {
  FeedbackSubmissionRow,
  FeedbackTriagePatch,
} from "@/types/feedback";

// No `feedbackErrorMessage` re-alias here: casework-api.ts marks its identical
// alias @deprecated in favour of importing `extractErrorMessage` from
// services/http directly, so callers do that.

const BASE = "/api/feedback-submissions";

export interface ListFeedbackParams {
  page?: number;
  page_size?: number;
  status?: string;
  feedback_type?: string;
  search?: string;
  ordering?: string;
}

export async function listFeedback(
  params: ListFeedbackParams = {},
): Promise<Paginated<FeedbackSubmissionRow>> {
  const { data } = await client.get<Paginated<FeedbackSubmissionRow>>(
    `${BASE}/`,
    { params },
  );
  return data;
}

export async function getFeedback(id: number | string): Promise<FeedbackSubmissionRow> {
  const { data } = await client.get<FeedbackSubmissionRow>(
    `${BASE}/${encodeURIComponent(String(id))}/`,
  );
  return data;
}

/** PATCH only — the endpoint refuses PUT, since only two fields are writable. */
export async function triageFeedback(
  id: number | string,
  patch: FeedbackTriagePatch,
): Promise<FeedbackSubmissionRow> {
  const { data } = await client.patch<FeedbackSubmissionRow>(
    `${BASE}/${encodeURIComponent(String(id))}/`,
    patch,
  );
  return data;
}
