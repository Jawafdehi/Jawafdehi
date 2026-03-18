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

export type EntityRelationshipType =
  | 'alleged'
  | 'related'
  | 'witness'
  | 'opposition'
  | 'victim';

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
  type?: EntityRelationshipType; // Relationship type in unified format (alleged, related, witness, etc.)
  notes?: string; // Additional context about the relationship
  alleged_cases?: number[]; // Case IDs where entity is alleged (legacy - backward compatibility)
  related_cases?: number[]; // Case IDs where entity is related (legacy - backward compatibility)
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
  title: string;
  case_start_date: string | null; // ISO date format
  case_end_date: string | null; // ISO date format
  entities: JawafEntity[]; // Unified entities array with type field (current format)
  alleged_entities?: JawafEntity[]; // Entities alleged to be involved (legacy format - backward compatibility)
  related_entities?: JawafEntity[]; // Related entities (legacy format - backward compatibility)
  locations: JawafEntity[]; // Location entities
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
