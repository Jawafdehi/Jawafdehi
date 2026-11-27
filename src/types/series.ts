// Case series: one affair's separate cases grouped under one page.
//
// The shape of JawafdehiAPI's `GET /api/series/<slug>/` and of the `series`
// keys it adds to the case detail payload and to search hits. Every key the
// API added for this feature is optional on the payloads that existed before
// it (case detail, case search cards), so the frontend keeps working against
// an API that has not deployed the series change yet.

import type { CaseImage } from "@/types/jds";

export interface SeriesText {
  ne: string | null;
  en: string | null;
}

/** One member case, as embedded in the series detail. */
export interface SeriesMemberCase {
  slug: string;
  title: string;
  title_en?: string | null;
  short_description?: string | null;
  status: string;
  case_type?: string | null;
  bigo?: number | null;
  proceedings_started_on?: string | null;
  proceedings_decided_on?: string | null;
  /** Court-case @id IRIs, in the case's own order. */
  court_cases: string[];
}

/**
 * Set when a member's बिगो claim is already inside another member's (e.g. a
 * predicate offence counted in the money-laundering बिगो). `member_slug` is
 * that member's case slug, or null when that case is not public. Added after
 * the first series release, so absent on an older API.
 */
export interface SeriesBigoOverlap {
  member_slug: string | null;
  reason: SeriesText;
}

export interface SeriesMember {
  ordinal: number;
  note: SeriesText;
  case: SeriesMemberCase;
  bigo_overlaps?: SeriesBigoOverlap | null;
}

/**
 * One row of the combined court-case list. Court tier: 1 special/district,
 * 2 high court, 3 supreme, 4 a member's proceedings outside any court (then
 * `iri`, `court` and `case_number` are null and the dates are the member's
 * `proceedings_started_on` / `proceedings_decided_on`).
 */
export interface SeriesCourtCase {
  iri: string | null;
  court: string | null;
  court_name: SeriesText;
  court_tier: number;
  case_number: string | null;
  member_slug: string;
  case_type?: string | null;
  registration_date_bs?: string | null;
  registration_date_ad?: string | null;
  case_status?: string | null;
  verdict_type?: string | null;
  verdict_date_bs?: string | null;
  verdict_date_ad?: string | null;
  plaintiff?: string | null;
  defendant?: string | null;
  about?: string | null;
}

export interface SeriesTimelineEvent {
  date: string;
  date_bs?: string | null;
  title: string;
  description?: string | null;
  member_slug?: string | null;
}

export interface SeriesAccused {
  nes_id: string;
  name: SeriesText;
  entity_type?: string | null;
  member_slugs: string[];
}

/** The same object as a case's `evidence[].material`; only what we render. */
export interface SeriesSourceMaterial {
  display_name: string;
  material_type?: string | null;
  urls?: Array<{ link: string; role: string }>;
  date?: string | null;
  date_ad?: string | null;
  description?: string | null;
  source_type?: string | null;
}

export interface SeriesSource {
  material_iri: string;
  material: SeriesSourceMaterial;
  member_slugs: string[];
}

export interface SeriesTotals {
  member_count: number;
  court_case_count: number;
  court_count: number;
  bigo_max: { amount: number; member_slug: string } | null;
  /**
   * The sum over members whose claim does not repeat another member's
   * (JawafdehiAPI feat/series-bigo-total). Absent from an API that predates
   * it: show `bigo_max` then.
   */
  bigo_total?: number | null;
  bigo_members_with_value?: number;
  /**
   * Sum of DISTINCT claims: every member's बिगो except members marked
   * `bigo_overlaps`. Null when nothing is summed; absent on an older API (then
   * the page shows `bigo_max` instead).
   */
  bigo_total?: number | null;
  /** How many members `bigo_total` sums. */
  bigo_total_members?: number;
  /** How many members are left out as overlapping another member's claim. */
  bigo_overlapping_members?: number;
  accused_count: number;
  status_counts: Record<string, number>;
  first_date?: string | null;
}

export interface SeriesDetail {
  slug: string;
  iri: string;
  tag?: string | null;
  title: SeriesText;
  summary: SeriesText;
  updated_at?: string;
  members: SeriesMember[];
  court_cases: SeriesCourtCase[];
  timeline: SeriesTimelineEvent[];
  accused: SeriesAccused[];
  sources: SeriesSource[];
  totals: SeriesTotals;
}

/** A case's membership of a series: case detail `series[]` and case hits' `card.series[]`. */
export interface CaseSeriesRef {
  slug: string;
  title: SeriesText;
  ordinal: number;
  member_count: number;
}

/** The `card` of a search hit whose `type` is "series". */
export interface SeriesSearchCard {
  slug: string;
  title: SeriesText;
  summary: SeriesText;
  totals: SeriesTotals;
  members: Array<{ ordinal: number; slug: string; court_case_numbers: string[] }>;
}

/**
 * The `card` of a collapsed-listing item (`GET /api/search/?type=case&
 * collapse_series=1`): the search card plus what the listing grid shows. One
 * of these stands in for all of its member cases on the homepage and /cases.
 */
export interface SeriesListingCard extends SeriesSearchCard {
  member_count: number;
  /** How many members matched the listing's filters (all of them when unfiltered). */
  matched_member_count: number;
  /** The newest member's proceedings start, AD "YYYY-MM-DD", or null. */
  latest_date: string | null;
  /** The first member's card image, or null. */
  thumbnail: CaseImage | null;
  thumbnail_url: string | null;
}
