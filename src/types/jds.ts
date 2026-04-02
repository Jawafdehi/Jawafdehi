/**
 * Jawafdehi API (JDS) Types
 * 
 * Type definitions for the accountability and cases API.
 * 
 * Reference: Jawafdehi_Public_Accountability_API.yaml
 * Base URL: https://portal.jawafdehi.org/api
 */

// ============================================================================
// Enums
// ============================================================================

export type CaseType = 
  | 'CORRUPTION'
  | 'PROMISES';

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
  id: number;
  nes_id: string | null; // Entity ID from Nepal Entity Service
  display_name: string | null; // Display name for the entity
  type?: string; // Relationship type: 'accused', 'alleged', 'related', 'witness', 'location', etc.
  notes?: string; // Additional notes about the relationship
  related_cases?: EntityCaseRelationship[]; // Unified case links with relation metadata
}

export interface EntityCaseRelationship {
  case_id: number;
  relation_type: string;
  notes: string;
}

export interface TimelineEntry {
  date: string; // ISO date format
  title: string;
  description: string;
}

export interface EvidenceEntry {
  source_id: number;
  description: string;
}

export interface Case {
  id: number;
  case_id: string; // Unique identifier shared across versions
  case_type: CaseType;
  state: CaseState; // Current state in the workflow
  title: string;
  case_start_date: string | null; // ISO date format
  case_end_date: string | null; // ISO date format
  thumbnail_url?: string | null; // URL for case card thumbnail image
  banner_url?: string | null; // URL for wide banner image on case detail page
  entities: JawafEntity[]; // Unified entity relationships with type field
  tags: string[]; // Tags for categorization (e.g., 'land-encroachment', 'national-interest')
  description: string; // Rich text description
  key_allegations: string[]; // List of key allegation statements
  timeline: TimelineEntry[];
  evidence: EvidenceEntry[];
  notes: string; // Internal notes (HTML from TinyMCE)
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export type CaseDetail = Case;

export interface DocumentSource {
  id: number;
  source_id: string;
  title: string;
  description: string;
  source_type: DocumentSourceType | string | null; // DocumentSourceType for known values; plain string covers legacy/unknown backend values; null if not classified
  url?: string[] | null; // Array of URLs for this source (may be missing or null during migration)
  related_entities: JawafEntity[]; // Related entities
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedCaseList {
  count: number;
  next: string | null;
  previous: string | null;
  results: Case[];
}

export interface PaginatedDocumentSourceList {
  count: number;
  next: string | null;
  previous: string | null;
  results: DocumentSource[];
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

export interface DocumentSourceSearchParams {
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
  last_updated: string;
}
