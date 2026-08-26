import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import ArchiveSearch from "./ArchiveSearch";
import MaterialSeriesBrowse from "./MaterialSeriesBrowse";
import MaterialsLanding from "./MaterialsLanding";

/**
 * /materials is three views behind one URL, decided by the query string:
 *
 *   /materials/                → the archive landing page (pre-rendered)
 *   /materials/?series=<slug>  → one series' browse page
 *   /materials/?q=…&tags=…&…   → the materials-locked archive search, exactly
 *                                as before — existing deep links keep working
 *
 * `?series=` combined with search params yields the SEARCH view: the search
 * API cannot scope to a source yet, so the query wins and the series param is
 * carried along inert rather than silently pretending to filter.
 *
 * Query-param views (not new paths) keep the edge Worker serving 200s via the
 * one known /materials route, and keep this page pre-rendered as the landing.
 */
const SEARCH_PARAMS = ["q", "tags", "case_type", "sort", "page"] as const;

export default function Materials() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const series = searchParams.get("series");
  const hasSearchIntent = SEARCH_PARAMS.some((param) => searchParams.has(param));

  if (hasSearchIntent) {
    return (
      <ArchiveSearch
        lockedType="material"
        heading={t("materialsPage.heading", "Documents & other materials")}
        description={t(
          "materialsPage.description",
          "Browse public government records and documents in the Jawafdehi archive — development projects, agency publications, and official materials.",
        )}
        placeholder={t("materialsPage.placeholder", "Search documents & other materials")}
        canonicalPath="/materials"
      />
    );
  }

  if (series) {
    return <MaterialSeriesBrowse slug={series} />;
  }

  return <MaterialsLanding />;
}
