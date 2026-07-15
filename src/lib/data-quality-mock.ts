import type { CaseStatistics } from "@/types/jds";

/**
 * Preview fixture for the Data Quality page, loaded via `?mock=1`.
 *
 * The platform DB is reachable only through the API, so the new aggregates
 * (cases_ciaa, ngm.by_year / by_court_type_year, nes.persons_by_sector) only
 * appear in the live `/api/statistics/` after the backend deploys and the
 * snapshot refreshes. This fixture mirrors the live payload for the existing
 * fields and supplies realistic values for the new ones — shaped exactly to
 * `CaseStatistics` — so every new section can be built and reviewed pre-merge.
 *
 * Existing-field values captured from live on 2026-07-13; new-field values are
 * illustrative but internally consistent (sector counts sum to the Person
 * total; matrix cells sum to their by_year row; CIAA split sums to all cases).
 */
export const MOCK_STATISTICS: CaseStatistics = {
  published_cases: 34,
  cases_under_investigation: 2891,
  // In review (being prepared) — a subset of the 2891 under investigation.
  cases_in_review: 512,
  cases_closed: 1,
  entities_tracked: 422,
  // New: CIAA vs non-CIAA (sums to 34 + 2891 + 1 = 2926 total cases).
  cases_ciaa: 1804,
  cases_non_ciaa: 1122,
  last_updated: "2026-07-13T14:21:38.192997+00:00",
  nes: {
    total: 184466,
    by_prefix: [
      { prefix: "person", count: 162614 },
      { prefix: "organization/hospital", count: 11399 },
      { prefix: "organization/government/ward", count: 6742 },
      { prefix: "organization/government/localunit", count: 753 },
      { prefix: "organization/political_party", count: 155 },
    ],
    by_type: [
      { entity_type: "Person", count: 162614 },
      { entity_type: "Hospital", count: 11399 },
      { entity_type: "GovernmentOrganization", count: 8554 },
      { entity_type: "Organization", count: 380 },
      { entity_type: "EducationalOrganization", count: 230 },
      { entity_type: "Organization,jawafdehi:PoliticalParty", count: 151 },
      { entity_type: "Organization,Corporation", count: 109 },
    ],
    // New: persons by sector — sums to the Person total (162,614). Distribution
    // reflects the verified reality (dataset dominated by local election
    // candidates); the near-empty sectors are kept for honest coverage.
    // Sectors the backend actually emits (derived from each person's memberOf
    // org): local government, elected politicians, health, other office, and the
    // persons with no resolvable office (not_recorded).
    persons_by_sector: [
      { sector: "local_gov", count: 154800 },
      { sector: "not_recorded", count: 4200 },
      { sector: "politicians", count: 2100 },
      { sector: "health", count: 1100 },
      { sector: "other", count: 414 },
    ],
    counts: {
      with_identifier: 181600,
      with_provenance: 122094,
      with_bilingual_name: 172112,
    },
    completeness: {
      with_identifier: 98.4,
      with_provenance: 66.2,
      with_bilingual_name: 93.3,
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
    // New: totals strip (each year = sum of its matrix row below).
    by_year: [
      { year: 2024, count: 118000 },
      { year: 2023, count: 132000 },
      { year: 2022, count: 145000 },
      { year: 2021, count: 138000 },
      { year: 2020, count: 121000 },
    ],
    // New: (court level x year) heatmap cells.
    by_court_type_year: [
      { court__court_type: "district", year: 2024, count: 73000 },
      { court__court_type: "high", year: 2024, count: 36500 },
      { court__court_type: "supreme", year: 2024, count: 7500 },
      { court__court_type: "special", year: 2024, count: 1000 },
      { court__court_type: "district", year: 2023, count: 82000 },
      { court__court_type: "high", year: 2023, count: 41000 },
      { court__court_type: "supreme", year: 2023, count: 8000 },
      { court__court_type: "special", year: 2023, count: 1000 },
      { court__court_type: "district", year: 2022, count: 90000 },
      { court__court_type: "high", year: 2022, count: 45000 },
      { court__court_type: "supreme", year: 2022, count: 9000 },
      { court__court_type: "special", year: 2022, count: 1000 },
      { court__court_type: "district", year: 2021, count: 86000 },
      { court__court_type: "high", year: 2021, count: 43000 },
      { court__court_type: "supreme", year: 2021, count: 8000 },
      { court__court_type: "special", year: 2021, count: 1000 },
      { court__court_type: "district", year: 2020, count: 75000 },
      { court__court_type: "high", year: 2020, count: 37500 },
      { court__court_type: "supreme", year: 2020, count: 7500 },
      { court__court_type: "special", year: 2020, count: 1000 },
    ],
    counts: {
      nes_resolved: 0,
      with_registration_date: 1610701,
      with_document_sources: 23208,
    },
    completeness: {
      nes_resolved: 0.0,
      with_registration_date: 100.0,
      with_document_sources: 1.4,
    },
  },
  materials: {
    total: 140020,
    by_type: [
      { material_type: "charge_sheet", count: 103447 },
      { material_type: "court_order", count: 23436 },
      { material_type: "precedent", count: 10468 },
      { material_type: "document", count: 2453 },
      { material_type: "news", count: 191 },
      { material_type: "legal_corpus", count: 13 },
      { material_type: "social_media", count: 10 },
      { material_type: "official_report", count: 2 },
    ],
    by_source: [
      { source: "ag", count: 99750 },
      { source: "court_order", count: 23233 },
      { source: "nkp", count: 10468 },
      { source: "ciaa_press_release", count: 3438 },
      { source: "dfmis", count: 2117 },
      { source: "jawafdehi", count: 744 },
      { source: "kanun_patrika", count: 220 },
      { source: "ciaa_annual_report", count: 41 },
      { source: "ppmo_blacklist", count: 4 },
    ],
    // Source×type cross-tab: which document types each source contributes.
    // Sums per source match by_source; CIAA's press releases + annual reports
    // and nkp + kanun_patrika roll up into one institution row each.
    by_source_type: [
      { source: "ag", material_type: "charge_sheet", count: 99750 },
      { source: "court_order", material_type: "court_order", count: 23233 },
      { source: "nkp", material_type: "precedent", count: 10468 },
      { source: "ciaa_press_release", material_type: "press_release", count: 3438 },
      { source: "dfmis", material_type: "document", count: 2117 },
      { source: "jawafdehi", material_type: "document", count: 500 },
      { source: "jawafdehi", material_type: "news", count: 191 },
      { source: "jawafdehi", material_type: "official_report", count: 30 },
      { source: "jawafdehi", material_type: "legal_corpus", count: 13 },
      { source: "jawafdehi", material_type: "social_media", count: 10 },
      { source: "kanun_patrika", material_type: "precedent", count: 220 },
      { source: "ciaa_annual_report", material_type: "official_report", count: 41 },
      { source: "ppmo_blacklist", material_type: "document", count: 4 },
    ],
    counts: {
      with_description: 10229,
      with_url: 16288,
      with_date: 2117,
    },
    completeness: {
      with_description: 7.3,
      with_url: 11.6,
      with_date: 1.5,
    },
  },
};
