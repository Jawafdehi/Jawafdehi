// PROTOTYPE — types for the caseworker "case update proposal" review queue.
// Mirrors work/2026-07-27-case-enrichment-events/DESIGN.md §9 + PROPOSAL-EXAMPLES.md.
// This is a design prototype fed by mock data; no backend endpoint exists yet.

export type ProposalStatus = "pending" | "approved" | "rejected" | "superseded";

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
export type Intent =
  | { type: "append_timeline_entry"; entry: TimelineEntry }
  | { type: "set_status"; field: string; from?: string; to: string }
  | { type: "link_material"; material: string; relation: string }
  | { type: "raw_patch"; patch: JsonPatchOp[] };

export type IntentType = Intent["type"];

export interface Provenance {
  source: string;
  detected_by: string; // "consumer:proposal-builder" | "caseworker:<id>"
  dedup_key: string;
  supersedes?: string;
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
