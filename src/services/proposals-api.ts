// Case update proposals API. Uses the ONE unified client (http.ts): same
// monolith origin, same auth (OIDC bearer or dev-auth session). Endpoints live
// under /api/case-update-proposals/ on the monolith.
//
// The backend stores provenance/origin/review as flat columns; this module
// adapts each row into the UI's nested `CaseUpdateProposal` so the components
// stay unchanged.
import { http as client, extractErrorMessage } from "./http";
import type { CaseUpdateProposal, ProposalStatus, SignalSource } from "@/types/proposals";

export const proposalErrorMessage = extractErrorMessage;

const BASE = "/api/case-update-proposals";

interface ApiRow {
  id: number | string;
  case_slug: string;
  case_title: string;
  source_kind: SignalSource;
  intent: CaseUpdateProposal["intent"];
  confidence: number;
  status: ProposalStatus;
  source: string;
  detected_by: string;
  dedup_key: string;
  supersedes: string;
  origin_subject: string;
  origin_msg_id: string;
  subject_refs: string[];
  reviewer: string;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
}

// Flatten the API row into the UI's nested shape.
function adapt(row: ApiRow): CaseUpdateProposal {
  return {
    id: String(row.id),
    // No case @id IRI from the API — cases are addressed by slug here.
    case_title: row.case_title,
    case_slug: row.case_slug,
    source_kind: row.source_kind,
    intent: row.intent,
    confidence: row.confidence,
    status: row.status,
    provenance: {
      source: row.source,
      detected_by: row.detected_by,
      dedup_key: row.dedup_key,
      supersedes: row.supersedes || undefined,
    },
    origin_event: {
      subject: row.origin_subject,
      msg_id: row.origin_msg_id,
      subject_refs: row.subject_refs ?? [],
    },
    review: {
      reviewer: row.reviewer || null,
      reviewed_at: row.reviewed_at,
      notes: row.review_notes || "",
    },
    created_at: row.created_at,
  };
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function listProposals(params?: {
  status?: string;
  source_kind?: string;
  case_slug?: string;
  page?: number;
  page_size?: number;
}): Promise<CaseUpdateProposal[]> {
  const { data } = await client.get<Paginated<ApiRow> | ApiRow[]>(`${BASE}/`, { params });
  const rows = Array.isArray(data) ? data : (data?.results ?? []);
  return rows.map(adapt);
}

export async function approveProposal(id: string, notes = ""): Promise<CaseUpdateProposal> {
  const { data } = await client.post<ApiRow>(`${BASE}/${id}/approve/`, { notes });
  return adapt(data);
}

export async function rejectProposal(id: string, notes = ""): Promise<CaseUpdateProposal> {
  const { data } = await client.post<ApiRow>(`${BASE}/${id}/reject/`, { notes });
  return adapt(data);
}
