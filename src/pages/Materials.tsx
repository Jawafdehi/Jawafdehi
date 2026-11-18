import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";

import ArchiveSearch from "./ArchiveSearch";
import MaterialsLanding from "./MaterialsLanding";
import { lazyChunk } from "@/lib/chunk-reload";

// The landing view is what /materials pre-renders; ?series= is client-rendered
// only, and it is the one variant with code of its own (filter panel, sheet,
// select). Behind a dynamic import that is ~4 KB gzip off the entry chunk.
// ArchiveSearch stays a static import: routes.tsx already imports it eagerly
// for /search, so a dynamic one here would defer nothing and only cost a frame.
const MaterialSeriesBrowse = lazy(lazyChunk(() => import("./MaterialSeriesBrowse"), (m) => m.default));

/**
 * /materials is three views behind one URL, decided by the query string:
 *
 *   /materials/                → the archive landing page (pre-rendered)
 *   /materials/?series=<slug>  → one series' browse page, which owns `q`/`sort`
 *                                and the date range WITHIN that series
 *   /materials/?source=<key>   → the same browse page for one whole source,
 *                                labelled from /api/document-sources/
 *   /materials/?q=…&tags=…&…   → the materials-locked archive search, exactly
 *                                as before — existing deep links keep working
 *
 * `?series=` now WINS over the search params. It used to lose: the search API
 * could not scope to a source, so a query had to mean the whole archive and the
 * series param was carried along inert. The API gained a `source` scope, so
 * `?series=x&q=y` can mean what it reads as — search inside that series — and the
 * series view puts its own controls in the URL. A bare `?q=` with no `?series=`
 * is untouched, so existing archive deep links still land on the search view.
 *
 * Query-param views (not new paths) keep the edge Worker serving 200s via the
 * one known /materials route, and keep this page pre-rendered as the landing.
 */
const SEARCH_PARAMS = ["q", "tags", "case_type", "sort", "page"] as const;

export default function Materials() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const series = searchParams.get("series");
  const folder = searchParams.get("folder");
  const source = searchParams.get("source");
  const hasSearchIntent = SEARCH_PARAMS.some((param) => searchParams.has(param));

  // The old ?folder=<path> preview URLs open the same folder in place.
  if (folder) {
    return <Navigate to={`/materials/?path=${encodeURI(folder)}#archive`} replace />;
  }

  if (series) {
    return (
      <Suspense fallback={null}>
        <MaterialSeriesBrowse slug={series} />
      </Suspense>
    );
  }

  // One whole source, from the API's live source list (lib/document-sources).
  if (source) {
    return (
      <Suspense fallback={null}>
        <MaterialSeriesBrowse sourceKey={source} />
      </Suspense>
    );
  }

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

  return <MaterialsLanding />;
}
