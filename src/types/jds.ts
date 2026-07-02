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
  | 'TAX_EVASION';

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

export interface JawafEntity {
  // Numeric primary key is NOT returned by the backend for case-bound entities
  // (the case serializer keys entity binds on `nes_id`); optional for the rare
  // callers that still carry a synthesized id. Prefer `nes_id` for lookups/links.
  id?: number;
  nes_id: string | null; // Entity ID from Nepal Entity Service
  display_name: string | null; // Display name for the entity
  type?: string; // Relationship type: 'accused', 'alleged', 'related', 'witness', 'location', 'respondent', 'petitioner', etc.
  notes?: string; // Additional notes about the relationship
  related_cases?: EntityCaseRelationship[]; // Unified case links with relation metadata
}

export interface EntityCaseRelationship {
  case_id: number;
  relation_type: string;
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
  verdict_date_bs: string | null;
  verdict_date_ad: string | null;
  verdict_judge: string | null;
  status: string;
  hearings: CourtCaseHearing[];
  entities: CourtCaseEntity[];
}

export interface Case {
  id: number;
  slug: string | null; // URL-friendly slug; older cases may not have one yet
  case_type: CaseType;
  state: CaseState; // Current state in the workflow
  title: string;
  short_description?: string | null;
  case_start_date: string | null; // ISO date format
  case_end_date: string | null; // ISO date format
  thumbnail_url?: string | null; // URL for case card thumbnail image
  banner_url?: string | null; // URL for wide banner image on case detail page
  entities: JawafEntity[]; // Unified entity relationships with type field
  tags: string[]; // Tags for categorization (e.g., 'land-encroachment', 'national-interest')
  key_allegations: string[]; // List of key allegation statements
  court_cases: string[]; // Court case IDs (e.g., "special:081-CR-0060")
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
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface CaseStatistics {
  published_cases: number;
  entities_tracked: number;
  cases_under_investigation: number;
  cases_closed: number;
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
