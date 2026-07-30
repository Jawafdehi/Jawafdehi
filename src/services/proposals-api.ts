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
  // Nullable on the wire (blank CharFields / an unset reviewer); adapt() below
  // normalises each into the shape the UI wants.
  supersedes: string | null;
  origin_subject: string;
  origin_msg_id: string;
  subject_refs: string[];
  reviewer: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
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

// Hard cap on pages walked, so a malformed/cyclic `next` chain can't spin forever.
const MAX_PAGES = 50;

// Pull the `page` cursor out of a DRF `next` link. We deliberately re-request the
// RELATIVE path with that cursor rather than following `next` verbatim: `next` is
// absolute and built from the request host, which behind the CDN/proxy can come
// back as an origin the browser shouldn't (or can't) call, and an absolute URL
// would also bypass the client's baseURL and auth setup.
function nextPage(next: string | null | undefined): number | null {
  if (!next) return null;
  const page = new URL(next, "https://placeholder.invalid").searchParams.get("page");
  const n = Number(page);
  return Number.isFinite(n) && n > 1 ? n : null;
}

// Fetches EVERY page, not just the first. The monolith paginates all list
// endpoints by default (PAGE_SIZE 20), so returning only page one silently hides
// proposal 21 onward — and a review queue that quietly omits pending work is
// worse than one that is slow. The queue also filters and sorts client-side, so
// it needs the whole set to be correct.
//
// No `page` parameter: this returns all pages by definition, so asking for one
// of them would be contradictory. `page_size` is still honoured (it just trades
// round-trips for response size).
export async function listProposals(params?: {
  status?: string;
  source_kind?: string;
  case_slug?: string;
  page_size?: number;
}): Promise<CaseUpdateProposal[]> {
  const rows: ApiRow[] = [];
  let page: number | null = null;

  for (let i = 0; i < MAX_PAGES; i++) {
    const { data } = await client.get<Paginated<ApiRow> | ApiRow[]>(`${BASE}/`, {
      params: page ? { ...params, page } : params,
    });
    if (Array.isArray(data)) {
      // Pagination disabled server-side — one unwrapped array, nothing to follow.
      rows.push(...data);
      break;
    }
    rows.push(...(data?.results ?? []));
    page = nextPage(data?.next);
    if (!page) break;
  }
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
