/**
 * Mock data for the Data Quality "Accountability Gap" POC.
 *
 * Two exports:
 *  - MOCK_STATISTICS: the exact `CaseStatistics` API shape, populated with the
 *    numbers verified against the live API on 2026-07-06 — but stated HONESTLY
 *    (e.g. registration-date completeness is the real 99.99%, not the rounded
 *    100% the production endpoint returns). This lets the redesign be demoed at
 *    `/data-quality?mock=1` without depending on the API.
 *  - MOCK_INSIGHTS: richer, public-facing insight fields the API does NOT expose
 *    yet (case concentration by office, documented-over-time momentum, the
 *    accountability ratio). These illustrate what we WANT the page to serve.
 *
 * Everything here is illustrative. The `?mock=1` toggle keeps the live path
 * (getStatistics) untouched in production.
 */

import type { CaseStatistics } from "@/types/jds";

/** POC-only insight fields not (yet) returned by `/api/statistics/`. */
export interface CaseConcentrationItem {
  /** Office / sector the cases cluster around. */
  label: string;
  /** Number of documented cases touching this office/sector. */
  count: number;
}

export interface DocumentedByMonthPoint {
  /** ISO `YYYY-MM` month. */
  month: string;
  /** Cumulative documented cases at the end of that month. */
  total: number;
}

export interface AccountabilityRatio {
  documented: number;
  published: number;
  /** documented / published, rounded — "1 in {ratio}". */
  ratio: number;
}

/** One row of the per-source coverage table (like OpenSanctions' source list). */
export interface SourceRow {
  /** i18n key suffix under dataQuality.sources.item.* for the source name. */
  key: string;
  /** Records this source contributes. */
  count: number;
  /** i18n key suffix under dataQuality.sources.frequency.* (monthly, asPublished, …). */
  frequency: string;
  /** ISO timestamp of the last successful refresh (drives the "x ago" label). */
  lastUpdatedIso: string;
  /** True when the source has stopped updating and the data is a frozen snapshot. */
  stale?: boolean;
}

/** Coverage of one court level over time (like CourtListener's per-jurisdiction ranges). */
export interface CourtCoverageRow {
  /** district | high | supreme | special */
  courtType: string;
  courtsCovered: number;
  courtsTotal: number;
  count: number;
  /** Earliest registration date we hold, Bikram Sambat + AD. */
  fromBs: string;
  fromAd: string;
  /** Latest registration date we hold. */
  toBs: string;
  toAd: string;
}

export interface MockInsights {
  ratio: AccountabilityRatio;
  concentration: CaseConcentrationItem[];
  documentedByMonth: DocumentedByMonthPoint[];
  sources: SourceRow[];
  courtCoverage: CourtCoverageRow[];
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

// The live snapshot uses a rolling `last_updated`; keep the mock feeling fresh
// by stamping it a few hours back at load. (Runs in the browser — Date is fine.)
const MOCK_LAST_UPDATED = new Date(
  Date.now() - 3 * 60 * 60 * 1000,
).toISOString();

export const MOCK_STATISTICS: CaseStatistics = {
  published_cases: 33,
  entities_tracked: 414,
  cases_under_investigation: 2893,
  cases_closed: 0,
  last_updated: MOCK_LAST_UPDATED,

  nes: {
    total: 183929,
    by_prefix: [],
    by_type: [
      { entity_type: "Person", count: 162095 },
      { entity_type: "Hospital", count: 11399 },
      { entity_type: "GovernmentOrganization", count: 8554 },
      { entity_type: "Company", count: 900 },
      { entity_type: "EducationalInstitution", count: 500 },
      { entity_type: "Bank", count: 220 },
      { entity_type: "Location", count: 180 },
      { entity_type: "Other", count: 81 },
    ],
    counts: {
      with_identifier: 181600,
      with_provenance: 24317,
      with_bilingual_name: 170509,
    },
    completeness: {
      with_identifier: 98.7,
      with_provenance: 13.2,
      with_bilingual_name: 92.7,
    },
  },

  ngm: {
    court_cases_total: 1610771,
    courts_total: 97,
    by_court_type: [
      { court__court_type: "district", count: 1000985 },
      { court__court_type: "high", count: 493966 },
      { court__court_type: "supreme", count: 103219 },
      { court__court_type: "special", count: 12601 },
    ],
    counts: {
      nes_resolved: 0,
      with_registration_date: 1610701,
      with_document_sources: 22551,
    },
    completeness: {
      nes_resolved: 0,
      // Honest: raw is 1,610,701 / 1,610,771 = 99.9957% (70 records missing).
      // The live API rounds this to 100.0 — the POC states it truthfully.
      with_registration_date: 99.99,
      with_document_sources: 1.4,
    },
  },

  materials: {
    total: 53010,
    by_type: [
      { material_type: "court_document", count: 46441 },
      { material_type: "press_release", count: 3479 },
      { material_type: "project_record", count: 2117 },
      { material_type: "other", count: 973 },
    ],
    by_source: [
      { source: "court_order", count: 23233 },
      { source: "court", count: 23208 },
      { source: "ciaa_press_release", count: 3438 },
      { source: "dfmis", count: 2117 },
      { source: "jawafdehi", count: 744 },
      { source: "kanun_patrika", count: 220 },
      { source: "ciaa_annual_report", count: 41 },
      { source: "province/koshi", count: 5 },
      { source: "ppmo_blacklist", count: 4 },
    ],
    counts: {
      with_description: 25012,
      with_url: 5820,
      with_date: 25325,
    },
    completeness: {
      with_description: 47.2,
      with_url: 11,
      with_date: 47.8,
    },
  },
};

const DOCUMENTED_TOTAL =
  MOCK_STATISTICS.published_cases +
  MOCK_STATISTICS.cases_under_investigation +
  MOCK_STATISTICS.cases_closed;

export const MOCK_INSIGHTS: MockInsights = {
  ratio: {
    documented: DOCUMENTED_TOTAL,
    published: MOCK_STATISTICS.published_cases,
    ratio: Math.round(DOCUMENTED_TOTAL / MOCK_STATISTICS.published_cases),
  },

  // Illustrative: which offices / sectors the documented cases cluster around.
  // The API doesn't expose this yet — it's the kind of answer the page should give.
  concentration: [
    { label: "Ministry of Physical Infrastructure", count: 214 },
    { label: "Nepal Electricity Authority", count: 176 },
    { label: "Department of Roads", count: 141 },
    { label: "Kathmandu Metropolitan City", count: 128 },
    { label: "Tribhuvan University", count: 97 },
    { label: "Nepal Oil Corporation", count: 88 },
    { label: "Ministry of Health & Population", count: 74 },
    { label: "Melamchi Water Supply Board", count: 61 },
  ],

  // Cumulative documented cases over the past ~14 months — the archive growing.
  documentedByMonth: [
    { month: "2025-06", total: 1180 },
    { month: "2025-07", total: 1395 },
    { month: "2025-08", total: 1602 },
    { month: "2025-09", total: 1840 },
    { month: "2025-10", total: 2010 },
    { month: "2025-11", total: 2190 },
    { month: "2025-12", total: 2360 },
    { month: "2026-01", total: 2495 },
    { month: "2026-02", total: 2610 },
    { month: "2026-03", total: 2705 },
    { month: "2026-04", total: 2790 },
    { month: "2026-05", total: 2858 },
    { month: "2026-06", total: 2905 },
    { month: "2026-07", total: DOCUMENTED_TOTAL },
  ],

  // Per-source freshness. One source is deliberately marked stale to show the
  // honest "this feed stopped updating" case (as OpenSanctions does).
  sources: [
    { key: "judiciary", count: 1610771, frequency: "monthly", lastUpdatedIso: ago(2 * DAY) },
    { key: "ciaa", count: 3479, frequency: "asPublished", lastUpdatedIso: ago(21 * DAY) },
    { key: "projectPortals", count: 53010, frequency: "monthly", lastUpdatedIso: ago(6 * DAY) },
    { key: "submissions", count: 128, frequency: "asReceived", lastUpdatedIso: ago(4 * DAY) },
    { key: "provinceKoshi", count: 5, frequency: "oneOff", lastUpdatedIso: ago(430 * DAY), stale: true },
  ],

  // Court coverage with real record counts and mock date ranges / court tallies.
  courtCoverage: [
    { courtType: "district", courtsCovered: 68, courtsTotal: 77, count: 1000985, fromBs: "2075-04", fromAd: "2018-07", toBs: "2082-03", toAd: "2025-07" },
    { courtType: "high", courtsCovered: 12, courtsTotal: 18, count: 493966, fromBs: "2074-01", fromAd: "2017-04", toBs: "2082-03", toAd: "2025-07" },
    { courtType: "supreme", courtsCovered: 1, courtsTotal: 1, count: 103219, fromBs: "2070-01", fromAd: "2013-04", toBs: "2082-03", toAd: "2025-07" },
    { courtType: "special", courtsCovered: 1, courtsTotal: 1, count: 12601, fromBs: "2072-01", fromAd: "2015-04", toBs: "2082-03", toAd: "2025-07" },
  ],
};
