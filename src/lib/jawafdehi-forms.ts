// Client-side vocab + helpers for the Jawafdehi corruption-case and document-
// source admin forms. The enum values mirror src/types/jds.ts (CaseType /
// CaseState / DocumentSourceType) and the backend serializers; the backend
// remains the authority and re-validates.
import type {
  CaseType,
  CaseState,
  DocumentSourceType,
} from "@/types/jds";
import type { PatchOp } from "@/services/admin-api";
import { isValidEntityIri } from "@/lib/datalake-forms";

// Corruption-case type + workflow-state choices (see types/jds.ts).
export const CASE_TYPES: readonly CaseType[] = [
  "CORRUPTION",
  "BRIBERY",
  "FORGERY",
  "EMBEZZLEMENT",
  "ABUSE_OF_OFFICE",
  "MONEY_LAUNDERING",
  "ILLEGAL_PROPERTY",
  "EXAM_RIGGING",
  "TAX_EVASION",
];

export const CASE_STATES: readonly CaseState[] = [
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "CLOSED",
];

// Document-source type choices (see types/jds.ts DocumentSourceType).
export const SOURCE_TYPES: readonly DocumentSourceType[] = [
  "LEGAL_COURT_ORDER",
  "LEGAL_PROCEDURAL",
  "OFFICIAL_GOVERNMENT",
  "FINANCIAL_FORENSIC",
  "INTERNAL_CORPORATE",
  "MEDIA_NEWS",
  "INVESTIGATIVE_REPORT",
  "PUBLIC_COMPLAINT",
  "LEGISLATIVE_DOC",
  "SOCIAL_MEDIA",
  "OTHER_VISUAL",
];

// Source-link roles. Uploaded files are RAW; the rest cover the URL kinds a
// source can carry (mirrors SourceLinkRole in types/jds.ts).
export const SOURCE_LINK_ROLES = [
  "RAW",
  "MARKDOWN",
  "PERMALINK",
  "SOURCE_PAGE",
  "ALTERNATE",
] as const;

// URL-friendly slug: lowercase alnum, hyphen-separated (mirrors the case-slug
// rule; reused from the entity slugify shape).
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Case sub-resource enums (F3/F4/F5) --------------------------------------
//
// Entity-relationship types (cases.models entity relationship enum). Drives the
// CORRUPTION-needs-ACCUSED / non-CORRUPTION-needs-non-LOCATION publish gates.
// The API (Case.validate()) re-enforces; this is only for the UI dropdown.
export const RELATIONSHIP_TYPES = [
  "ACCUSED",
  "ALLEGED",
  "RELATED",
  "WITNESS",
  "OPPOSITION",
  "VICTIM",
  "LOCATION",
  "RESPONDENT",
  "PETITIONER",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

// --- Row shapes for the sub-resource editors (match §3 patch value shapes) ----

export interface EntityRelationshipRow {
  nes_id: string;
  relationship_type: RelationshipType;
  notes: string;
}

export interface TimelineEventRow {
  date: string; // AD, ISO YYYY-MM-DD
  date_bs: string; // BS, e.g. 2080-09-18
  title: string;
  description: string;
}

// One evidence entry = a reference to a data-lake material (the CaseMaterialReference
// join; ADR "cases own no documents"). material_iri is a canonical material @id
// IRI; additional_details is an optional case-specific note.
export interface EvidenceRow {
  material_iri: string;
  additional_details: string;
}

// --- Validators --------------------------------------------------------------

// Case slug rule mirrors Case.save()/validate(): lowercase alnum,
// hyphen-separated (same shape as the entity slug).
export const CASE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function isValidSlug(value: string): boolean {
  return CASE_SLUG_RE.test(value.trim());
}

// A BS/AD date field the editor accepts: empty or YYYY-MM-DD (both calendars
// use the same numeric shape). Empty is allowed (optional field).
export function isValidDateField(value: string): boolean {
  const v = value.trim();
  return v === "" || /^\d{4}-\d{1,2}-\d{1,2}$/.test(v);
}

// A court-case reference is "<court>:<case_number>" — lowercase-alnum court id,
// then a hyphen/alnum case number, no slashes/scheme (mirrors the /court_cases
// patch value shape).
export const COURT_CASE_REF_RE = /^[a-z0-9-]+:[A-Za-z0-9-]+$/;

export function isValidCourtCaseRef(value: string): boolean {
  return COURT_CASE_REF_RE.test(value.trim());
}

// An entity-relationship row is complete when it has a valid entity IRI and a
// relationship type. `notes` is optional.
export function isValidEntityRow(row: EntityRelationshipRow): boolean {
  return (
    isValidEntityIri(row.nes_id) &&
    (RELATIONSHIP_TYPES as readonly string[]).includes(row.relationship_type)
  );
}

// A timeline row needs at least a title and a valid AD date; BS date optional.
export function isValidTimelineRow(row: TimelineEventRow): boolean {
  return (
    row.title.trim() !== "" &&
    row.date.trim() !== "" &&
    isValidDateField(row.date) &&
    isValidDateField(row.date_bs)
  );
}

// --- Patch builders (RFC-6902) -----------------------------------------------
//
// The case PATCH is a flat array of RFC-6902 ops (§3), sent as the raw request
// body (patchCase does not wrap them). Sub-resources are sent as a single
// whole-list `replace` (documented clobber-on-concurrent-edit tradeoff in §3).

// A generic scalar/list replace op.
export function replaceOp(path: string, value: unknown): PatchOp {
  return { op: "replace", path, value };
}

// Entity relationships → replace /entities. Notes coerced to string; blank rows
// (no nes_id) dropped so the user can leave a trailing empty add-row.
export function buildEntitiesPatch(rows: EntityRelationshipRow[]): PatchOp {
  const value = rows
    .filter((r) => r.nes_id.trim() !== "")
    .map((r) => ({
      nes_id: r.nes_id.trim(),
      relationship_type: r.relationship_type,
      notes: r.notes ?? "",
    }));
  return replaceOp("/entities", value);
}

// Timeline events → replace /timeline. Empty optional fields become "".
export function buildTimelinePatch(rows: TimelineEventRow[]): PatchOp {
  const value = rows
    .filter((r) => r.title.trim() !== "" || r.date.trim() !== "")
    .map((r) => ({
      date: r.date.trim(),
      date_bs: r.date_bs.trim(),
      title: r.title.trim(),
      description: r.description ?? "",
    }));
  return replaceOp("/timeline", value);
}

// Evidence links → replace /evidence. Drops rows without a material IRI.
export function buildEvidencePatch(rows: EvidenceRow[]): PatchOp {
  const value = rows
    .filter((r) => r.material_iri.trim())
    .map((r) => ({
      material_iri: r.material_iri.trim(),
      additional_details: r.additional_details.trim(),
    }));
  return replaceOp("/evidence", value);
}

// Tags / key allegations / court cases → replace with a trimmed, de-blanked list.
export function buildStringListPatch(path: string, items: string[]): PatchOp {
  const value = items.map((s) => s.trim()).filter((s) => s !== "");
  return replaceOp(path, value);
}
