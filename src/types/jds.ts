/**
 * Jawafdehi API (JDS) Types
 * 
 * Type definitions for the accountability and cases API.
 *
 * Reference: Jawafdehi_Public_Accountability_API.yaml
 * Served by the unified monolith under `/api` (see services/jds-api.ts).
 */

// ============================================================================
// Enums
// ============================================================================

export type CaseType =
  | 'CORRUPTION'
  | 'BRIBERY'
  | 'FORGERY'
  | 'EMBEZZLEMENT'
  | 'ABUSE_OF_OFFICE'
  | 'MONEY_LAUNDERING'
  | 'ILLEGAL_PROPERTY'
  | 'EXAM_RIGGING'
  | 'TAX_EVASION'
  | 'BANKING_OFFENCE';

export type CaseState =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'PUBLISHED'
  | 'CLOSED';

export type DocumentSourceType =
  | 'LEGAL_COURT_ORDER'
  | 'LEGAL_PROCEDURAL'
  | 'OFFICIAL_GOVERNMENT'
  | 'FINANCIAL_FORENSIC'
  | 'INTERNAL_CORPORATE'
  | 'MEDIA_NEWS'
  | 'INVESTIGATIVE_REPORT'
  | 'PUBLIC_COMPLAINT'
  | 'LEGISLATIVE_DOC'
  | 'SOCIAL_MEDIA'
  | 'OTHER_VISUAL';

export const DocumentSourceTypeKeys: Record<DocumentSourceType, string> = {
  LEGAL_COURT_ORDER: 'sourceType.LEGAL_COURT_ORDER',
  LEGAL_PROCEDURAL: 'sourceType.LEGAL_PROCEDURAL',
  OFFICIAL_GOVERNMENT: 'sourceType.OFFICIAL_GOVERNMENT',
  FINANCIAL_FORENSIC: 'sourceType.FINANCIAL_FORENSIC',
  INTERNAL_CORPORATE: 'sourceType.INTERNAL_CORPORATE',
  MEDIA_NEWS: 'sourceType.MEDIA_NEWS',
  INVESTIGATIVE_REPORT: 'sourceType.INVESTIGATIVE_REPORT',
  PUBLIC_COMPLAINT: 'sourceType.PUBLIC_COMPLAINT',
  LEGISLATIVE_DOC: 'sourceType.LEGISLATIVE_DOC',
  SOCIAL_MEDIA: 'sourceType.SOCIAL_MEDIA',
  OTHER_VISUAL: 'sourceType.OTHER_VISUAL',
};

// ============================================================================
// Main Types
// ============================================================================

// Verdict outcome of a case<->entity relationship. Distinct from `type` (the
// role): 'charged' is the default/undecided state; 'acquitted' is essential —
// "not convicted" cannot distinguish acquitted from pending.
export type EntityOutcome = "charged" | "convicted" | "acquitted" | "abated";

/** A case image, pre-rendered by the backend into a responsive width ladder.
 *
 * Everything an `<img>` needs except `sizes`, which is per-layout and so belongs
 * to whichever component is doing the rendering. Feed `srcset` to the browser and
 * let it pick; `src` is the largest tier, for consumers that ignore srcset.
 *
 * `width`/`height` describe that largest tier. Set them on the `<img>` so the
 * browser reserves the right box before the bytes land — without them a case list
 * reflows as each card's image arrives.
 */
export interface CaseImage {
  src: string;
  /** `"<url> 400w, <url> 800w, …"`, ascending. */
  srcset: string;
  width: number;
  height: number;
  alt: string;
}

export interface JawafEntity {
  // Numeric primary key is NOT returned by the backend for case-bound entities
  // (the case serializer keys entity binds on `nes_id`); optional for the rare
  // callers that still carry a synthesized id. Prefer `nes_id` for lookups/links.
  id?: number;
  nes_id: string | null; // Entity ID from Nepal Entity Service
  display_name: string | null; // Display name for the entity
  type?: string; // Relationship type: 'accused', 'alleged', 'related', 'witness', 'location', 'respondent', 'petitioner', etc.
  outcome?: EntityOutcome | null; // Verdict — only on 'accused'; null for every other role
  notes?: string; // Additional notes about the relationship
  related_cases?: EntityCaseRelationship[]; // Unified case links with relation metadata
}

export interface EntityCaseRelationship {
  case_id: number;
  relation_type: string;
  outcome?: EntityOutcome | null; // Verdict — only on 'accused'; null otherwise
  notes: string;
}

export interface TimelineEntry {
  date: string; // AD ISO date format
  title: string;
  description: string;
  date_bs?: string; // Bikram Sambat date (YYYY-MM-DD), as recorded in the source
  end_date?: string; // AD ISO date; present when the event spans a period
  end_date_bs?: string; // Bikram Sambat date (YYYY-MM-DD) for the span's end
}

/**
 * Resolved material embedded on each case-detail evidence entry.
 *
 * The case DETAIL serializer enriches every CaseMaterialReference with the
 * resolved NGM material: `{display_name, material_type, urls}` (a stub with
 * null fields / empty urls when the material can't be resolved). `urls` is the
 * roled link list (RAW/PERMALINK/MARKDOWN/…). See cases/serializers.py
 * CaseDetailSerializer.get_evidence.
 */
export interface EvidenceMaterial {
  display_name: string | null;
  material_type: string | null;
  urls: SourceLink[];
}

/**
 * A case evidence entry: a reference to a material (`material_iri`) plus a
 * per-case note (`additional_details`). The DETAIL endpoint additionally embeds
 * the resolved `material`; the LIST endpoint omits it.
 */
export interface EvidenceEntry {
  material_iri: string;
  additional_details: string;
  material?: EvidenceMaterial;
}

export interface CourtCaseHearing {
  id: number;
  case_number: string;
  court_identifier: string;
  hearing_date_bs: string;
  hearing_date_ad: string;
  bench: string | null;
  bench_type: string;
  judge_names: string | null;
  lawyer_names: string | null;
  serial_no: string;
  case_status: string;
  decision_type: string;
  remarks: string;
}

export interface CourtCaseEntity {
  id: number;
  case_number: string;
  court_identifier: string;
  side: string;
  name: string;
  address: string | null;
  nes_id: string | null;
}

export interface CourtCase {
  case_number: string;
  court_identifier: string;
  registration_date_bs: string | null;
  registration_date_ad: string | null;
  case_type: string | null;
  division: string | null;
  category: string | null;
  section: string | null;
  plaintiff: string | null;
  defendant: string | null;
  original_case_number: string;
  case_id: string | null;
  priority: string | null;
  registration_number: string;
  case_status: string | null;
  /**
   * Classified outcome — ACQUITTED / CONVICTED / PARTIALLY_CONVICTED for a trial
   * court, AFFIRMED / REVERSED / PARTIALLY_REVERSED for an appellate bench.
   *
   * The API whitelists this before serving it: the column carries no DB
   * constraint and ~1.3% of Supreme rows hold raw portal text — bench referrals
   * and interlocutory orders that read like dispositions while the case is
   * still live. Unrecognised values arrive as null, so null means "no
   * classified verdict on record", NOT "still pending". See JawafdehiAPI#438.
   */
  verdict_type: string | null;
  verdict_date_bs: string | null;
  verdict_date_ad: string | null;
  verdict_judge: string | null;
  status: string;
  // Sub-resources present only on the assembled "full" shape (getCourtCaseFull).
  // The composite-key core endpoint (getCourtCase) omits them entirely, so every
  // reader must treat them as optional and default to [].
  hearings?: CourtCaseHearing[];
  entities?: CourtCaseEntity[];
}

/** One credited author on a case's public byline, resolved from their profile.
 *
 * Every field except the list position is PER-PERSON: the byline's only per-case
 * fact is the order these come back in. A rename therefore shows the new name on
 * every case that person wrote, which is the intended behaviour.
 */
export interface CaseAuthorCredit {
  /** Profile handle; the card links to /author/<slug> when has_public_page. */
  slug: string;
  display_name: string;
  /** Nepali name; empty when unset (fall back to display_name). */
  name_ne?: string;
  photo_url?: string;
  /** One-line role, e.g. "Caseworker" or "BALLB 4th Year Student". */
  title?: string;
  /** False for an auto-created profile nobody has filled in yet — do not link. */
  has_public_page: boolean;
  /** Casework viewers only — omitted from public reads. */
  user_id?: number;
}

/** A public social link on an author profile. Mirrors team.ts ContactType. */
export interface AuthorLink {
  type: "facebook" | "instagram" | "linkedin" | "github" | "website" | "twitter";
  value: string;
}

/** A case card on an author's profile page. */
export interface AuthorCaseSummary {
  slug: string;
  title: string;
  short_description?: string;
  case_type: string;
  thumbnail_url?: string;
  case_publish_date: string | null;
  bigo: number | null;
}

/** The public author profile at /author/<slug>. */
export interface AuthorProfile {
  slug: string;
  display_name: string;
  name_ne?: string;
  photo_url?: string;
  /** One-line role shown under the name (and on author cards). */
  title?: string;
  /** Longer biography (markdown), profile page only. */
  bio?: string;
  /** null when the author has not published an address. */
  email: string | null;
  links: AuthorLink[];
  cases: AuthorCaseSummary[];
}

/** One entry in a case's public, caseworker-curated edit history. */
export interface CaseEditHistoryEntry {
  date: string; // ISO date (AD)
  remarks: string;
}

export interface Case {
  id: number;
  slug: string | null; // URL-friendly slug; older cases may not have one yet
  case_type: CaseType;
  state: CaseState; // Current state in the workflow
  title: string;
  short_description?: string | null;
  // DEPRECATED free-text byline, superseded by `authors` / `case_publish_date` /
  // `public_edit_history` below. Still returned, and still rendered as a
  // fallback on cases that have not been backfilled with structured authors.
  public_notes?: string | null;
  // The structured public byline. `user_id` is present only for casework
  // viewers (the editor needs it to round-trip the list through PATCH); public
  // callers get the name and credit note only.
  authors?: CaseAuthorCredit[];
  case_publish_date?: string | null; // ISO date the case first went live
  public_edit_history?: CaseEditHistoryEntry[];
  case_start_date: string | null; // ISO date format
  case_end_date: string | null; // ISO date format
  // The case images as responsive payloads, generated by Wagtail from a single
  // upload. Each falls back to the other server-side, so a case with only one
  // uploaded image gets both — null here means no image was ever uploaded, and
  // the caller should fall back to the deprecated URLs below.
  thumbnail?: CaseImage | null; // Card ladder (400/800/1200w) — home, search
  banner?: CaseImage | null; // Hero ladder (640/1280/1600w) — case detail
  // Ids of the underlying library images. Editor-only: the admin form reads
  // these back to show the current selection and PATCHes the same names.
  thumbnail_image_id?: number | null;
  banner_image_id?: number | null;
  // DEPRECATED free-text URLs, superseded by `thumbnail` / `banner` above. Bare
  // links with no renditions, so they load at whatever size they were authored
  // at. Still returned for the cases that predate the upload flow.
  thumbnail_url?: string | null;
  banner_url?: string | null;
  entities: JawafEntity[]; // Unified entity relationships with type field
  tags: string[]; // Tags for categorization (e.g., 'land-encroachment', 'national-interest')
  key_allegations: string[]; // List of key allegation statements
  court_cases: string[]; // Canonical court-case @id IRIs (e.g., "https://jawafdehi.org/courtcase/special/081-cr-0060"); legacy "<court>:<number>" tolerated on read
  bigo?: number | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
  // The following heavy body fields are returned only by the case DETAIL
  // endpoint. The slim LIST endpoint (CaseListSerializer) omits them, so they
  // are optional on the base shape and re-asserted as required on CaseDetail.
  description?: string; // Rich text description (HTML or Markdown)
  timeline?: TimelineEntry[];
  evidence?: EvidenceEntry[];
  notes?: string; // Internal notes (HTML or Markdown)
  missing_details?: string | null;
}

export interface CaseDetail extends Case {
  description: string;
  timeline: TimelineEntry[];
  evidence: EvidenceEntry[];
  notes: string;
  public_notes: string;
  authors: CaseAuthorCredit[];
  case_publish_date: string | null;
  public_edit_history: CaseEditHistoryEntry[];
  bigo: number | null; // Embezzled/irregular amount in NPR (null if not applicable)
  court_cases: string[] | null;
}

export type SourceLinkRole =
  | 'RAW'
  | 'MARKDOWN'
  | 'PERMALINK'
  | 'SOURCE_PAGE'
  | 'ALTERNATE';

/** A source link with an explicit role (the `urls` field shape). */
export interface SourceLink {
  link: string;
  role: SourceLinkRole;
}

// NOTE: The standalone DocumentSource resource (and its /api/sources routes)
// was removed with the "cases own no documents" ADR. Case evidence now
// references MATERIALS by @id IRI; the resolved material is embedded on each
// evidence entry (see EvidenceMaterial / EvidenceEntry above).

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedCaseList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Case[];
}

// ============================================================================
// Search/Filter Parameters
// ============================================================================

export interface CaseSearchParams {
  case_type?: CaseType;
  tags?: string;
  search?: string;
  page?: number;
  /** Server honours ?page_size= up to 200 (CasePagination). */
  page_size?: number;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface CaseStatistics {
  published_cases: number;
  entities_tracked: number;
  cases_under_investigation: number;
  // Cases being prepared for publication (state IN_REVIEW) — a subset of
  // cases_under_investigation. Optional so pre-deploy/cached payloads stay safe.
  cases_in_review?: number;
  cases_closed: number;
  // CIAA vs non-CIAA split, classified by the criminal "CR" court-case number.
  // Optional so older cached payloads (and pre-deploy responses) stay type-safe.
  cases_ciaa?: number;
  cases_non_ciaa?: number;
  // Total bigo (बिगो) — summed disputed/embezzled amount (NPR) across published
  // cases. Optional so older cached payloads (and pre-deploy responses) stay safe.
  total_bigo?: number;
  // Cross-source data-quality coverage (entities + judicial records). The
  // `nes`/`ngm` keys are the backend response field names (part of the JSON
  // contract). Optional so older cached payloads stay type-safe.
  nes?: EntityMetrics;
  ngm?: DataLakeMetrics;
  materials?: MaterialsMetrics;
  last_updated: string;
}

/** Entity coverage metrics surfaced by the data quality dashboard. */
export interface EntityMetrics {
  total: number;
  by_prefix: { prefix: string; count: number }[];
  by_type: { entity_type: string; count: number }[];
  // Persons grouped by governance/employment sector (classified server-side).
  // Sums to the Person total; optional for pre-deploy/older payloads.
  persons_by_sector?: { sector: string; count: number }[];
  counts: {
    with_identifier: number;
    with_provenance: number;
    with_bilingual_name: number;
  };
  completeness: {
    with_identifier: number;
    with_provenance: number;
    with_bilingual_name: number;
  };
}

/** Judicial-record coverage metrics surfaced by the data quality dashboard. */
export interface DataLakeMetrics {
  court_cases_total: number;
  courts_total: number;
  by_court_type: { court__court_type: string; count: number }[];
  // Court volume over time. by_year is the totals strip; by_court_type_year is
  // the (court level x year) heatmap source. Optional for pre-deploy payloads.
  // bs_year is a BIKRAM SAMBAT year, read off the court register itself (the API
  // derives its Gregorian dates from it, not the other way round) — BS 2081 spans
  // mid-April 2024 to mid-April 2025, so never render one as if it were AD.
  by_year?: { bs_year: number; count: number }[];
  by_court_type_year?: { court__court_type: string; bs_year: number; count: number }[];
  counts: {
    nes_resolved: number;
    with_registration_date: number;
    with_document_sources: number;
  };
  completeness: {
    nes_resolved: number;
    with_registration_date: number;
    with_document_sources: number;
  };
}

/** Materials (development-project / document dataset) coverage metrics. */
export interface MaterialsMetrics {
  total: number;
  by_type: { material_type: string; count: number }[];
  by_source: { source: string; count: number }[];
  /** Source×type cross-tab: how many of each document type each source holds. */
  by_source_type: { source: string; material_type: string; count: number }[];
  counts: {
    with_description: number;
    with_url: number;
    with_date: number;
  };
  completeness: {
    with_description: number;
    with_url: number;
    with_date: number;
  };
}
