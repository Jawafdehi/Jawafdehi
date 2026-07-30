// Types for the caseworker "case update proposal" review queue, mirroring the
// CaseUpdateProposal model served by /api/case-update-proposals/.

export type ProposalStatus = "pending" | "approved" | "rejected";

// Where the raw signal came from — a UI convenience classification (in the real
// system this is derived from provenance.source / the subject it arrived on).
export type SignalSource =
  | "ngm_docket"
  | "court_order"
  | "ciaa_press"
  | "news"
  | "caseworker";

// A timeline entry keeps the EXACT shape of the existing Case.timeline JSONField
// (date AD ISO + title required; description + BS dates optional), plus a flag
// for the BS→AD ±1-day gazette uncertainty on CIAA-sourced dates.
export interface TimelineEntry {
  date: string;
  title: string;
  description?: string;
  date_bs?: string;
  end_date?: string;
  end_date_bs?: string;
  date_ad_uncertain?: boolean;
}

export interface JsonPatchOp {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

// The tagged-union "change intent" — typed intents for the common cases + a raw
// RFC-6902 patch escape hatch. This is the ONLY part the LLM (`claude -p`) emits.
// Must stay in step with SUPPORTED_INTENT_TYPES on the backend, which accepts and
// applies exactly these three (`set_status` was dropped: a Case has no legal-status
// field, so status facts go in the timeline and raw_patch covers the rest).
export type Intent =
  | { type: "append_timeline_entry"; entry: TimelineEntry }
  | { type: "link_material"; material: string; relation: string }
  | { type: "raw_patch"; patch: JsonPatchOp[] };

export type IntentType = Intent["type"];

export interface Provenance {
  source: string;
  detected_by: string; // "consumer:proposal-builder" | "caseworker:<id>"
  dedup_key: string;
}

export interface OriginEvent {
  subject: string;
  msg_id: string;
  subject_refs: string[];
}

export interface CaseUpdateProposal {
  id: string;
  // Optional case @id IRI. The live API addresses cases by slug (case_slug);
  // mock fixtures may still carry the full IRI.
  case?: string;
  // UI conveniences (derived server-side in the real thing):
  case_title: string;
  case_slug: string;
  source_kind: SignalSource;
  intent: Intent;
  confidence: number; // 0..1 — REQUIRED on every proposal
  status: ProposalStatus;
  provenance: Provenance;
  origin_event: OriginEvent;
  review: { reviewer: string | null; reviewed_at: string | null; notes: string };
  created_at: string;
}
