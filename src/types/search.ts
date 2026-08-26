// Unified platform search contract (Think-Big unified search).
// One ranked, typed, bilingual result set across entities, materials, court
// cases, and PUBLISHED Jawafdehi cases. Served by GET /api/search/.

// The four indexed result domains. "all" is a UI-only sentinel (sent as "no type
// filter"); it is never a value the backend returns on a result.
export type ArchiveSearchResultType =
  | "entity"
  | "material"
  | "courtcase"
  | "case";

export type ArchiveSearchType = "all" | ArchiveSearchResultType;

// `featured` orders by the editorial `weight` on Case, then newest-by-case-date.
// It began as a homepage-only curation mode, but the archive search offers it too
// and defaults to it while browsing: with no query text every document scores the
// same, so `relevance` there is not a ranking at all — just the `iri` tiebreaker,
// i.e. alphabetical by slug. Non-case records carry no weight and tie at 0, so
// they fall through to newest-first.
export type ArchiveSearchSort = "relevance" | "newest" | "oldest" | "title" | "featured";

// Bilingual text: either side may be null (a record can carry only one script).
export interface BilingualText {
  ne: string | null;
  en: string | null;
}

export interface ArchiveSearchParams {
  q?: string;
  type?: ArchiveSearchResultType;
  // Exact-match refine facets (each a repeatable query param).
  entity_type?: string[];
  case_type?: string[];
  tags?: string[];
  // Case-list lifecycle facet. API param is `status`; OpenSearch field is `case_status`.
  status?: string[];
  sort?: ArchiveSearchSort;
  page?: number;
  page_size?: number;
  // Opaque deep-paging cursor (next_cursor from a prior response).
  cursor?: string;
}

export interface SearchFacetItem {
  name: string;
  count: number;
}

// The refine facets the unified service aggregates (the `role` facet from the
// legacy contract is intentionally gone — relationship data is not indexed).
export interface ArchiveSearchFacets {
  entity_type: SearchFacetItem[];
  case_type: SearchFacetItem[];
  tags: SearchFacetItem[];
  status: SearchFacetItem[];
}

export interface CaseSearchCardEntity {
  nes_id: string | null;
  display_name: string | null;
  entity_type: string | null;
  type: string;
  outcome?: string | null;
  notes?: string | null;
}

export interface CaseSearchCard {
  slug: string | null;
  title: string;
  short_description: string | null;
  key_allegations: string[];
  tags: string[];
  case_type: string | null;
  status: "ongoing" | "closed" | "others";
  case_start_date: string | null;
  case_end_date: string | null;
  bigo: number | null;
  thumbnail_url: string | null;
  banner_url: string | null;
  timeline: Array<Record<string, unknown>>;
  entities: CaseSearchCardEntity[];
}

// Type-specific metadata the service surfaces in the `extra` blob (all optional).
export interface SearchResultExtra {
  date?: string;
  date_bs?: string;
  type?: string;
  case_type?: string;
  case_status?: string;
  court?: string;
  case_number?: string;
}

// One result hit — the common envelope every type shares. Rich per-result
// relational detail (case entities, role counts, etc.) is NOT in the index; the
// result card hydrates it lazily from the owning-app detail APIs when needed.
export interface ArchiveSearchResult {
  type: ArchiveSearchResultType;
  // IRI for entity/material; synthesized id/slug-bearing IRI for courtcase/case.
  id: string;
  // Backend-provided origin tag (part of the /api/search response contract).
  source_app: "nes" | "ngm" | "jawafdehi";
  title: BilingualText;
  snippet: BilingualText;
  score: number;
  // Frontend navigation URL (may be the IRI itself for material/courtcase).
  url: string;
  // Owning-app detail API (null for entities/materials with no public detail API).
  api_url: string | null;
  matched_fields: string[];
  extra: SearchResultExtra;
  // Present for case hits after the jawafdehi-cases card-payload enrichment. Older
  // cached/indexed docs may omit it, so callers must keep a safe fallback.
  card?: CaseSearchCard;
}

// Per-type result counts (distinct from the refine facets above).
export interface ArchiveSearchCounts {
  entity: number;
  material: number;
  courtcase: number;
  case: number;
}

export interface ArchiveSearchResponse {
  query: string;
  lang: string;
  sort: ArchiveSearchSort;
  page: number;
  page_size: number;
  count: number;
  counts: Partial<ArchiveSearchCounts>;
  facets: ArchiveSearchFacets;
  results: ArchiveSearchResult[];
  next_cursor: string | null;
  // A single suggested spelling for the query, or null when there is nothing to
  // suggest. The backend offers one on either of two conditions: the search
  // returned nothing, OR it returned only fuzzy matches — meaning every
  // spell-checkable token was itself a misspelling, so the hits have no
  // exactly-matching anchor. A correctly spelled query that found real records
  // never carries one.
  //
  // So it is NOT only an empty-state affordance: `?q=coruption` returns 199 real
  // records AND a suggestion of "corruption". Render it in both cases.
  //
  // Never apply it automatically. Silently rewriting a search for a person's name
  // in an accountability archive would show the reader records about someone they
  // did not ask about, with no indication it happened. It is an offer the reader
  // accepts. Optional in the type because older cached responses / mocks omit it.
  did_you_mean?: string | null;
  // Ephemeral per-response id (not a user/session id). Echoed back on a result
  // click (POST /api/search/click) to join query → clicked result server-side.
  // Optional: older cached responses / mocks may omit it.
  search_id?: string;
}
