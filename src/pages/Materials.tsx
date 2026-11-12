import { archiveSearchUrl } from "@/lib/archive-redirect";
import { lazy, Suspense } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import MaterialsLanding from "./MaterialsLanding";
import { lazyChunk } from "@/lib/chunk-reload";

// The landing view is what /materials pre-renders; ?series= is client-rendered
// only, and it is the one variant with code of its own (filter panel, sheet,
// select). Behind a dynamic import that is ~4 KB gzip off the entry chunk.
const MaterialSeriesBrowse = lazy(lazyChunk(() => import("./MaterialSeriesBrowse"), (m) => m.default));

/**
 * /materials is three views behind one URL, decided by the query string:
 *
 *   /materials/                → the archive landing page (pre-rendered)
 *   /materials/?series=<slug>  → one series' browse page, which owns `q`/`sort`
 *                                and the date range WITHIN that series
 *   /materials/?q=…&tags=…&…   → redirects to /search?type=material with the
 *                                same params — every search lives on /search,
 *                                and existing deep links keep working
 *
 * `?series=` now WINS over the search params. It used to lose: the search API
 * could not scope to a source, so a query had to mean the whole archive and the
 * series param was carried along inert. The API gained a `source` scope, so
 * `?series=x&q=y` can mean what it reads as — search inside that series — and the
 * series view puts its own controls in the URL. A bare `?q=` with no `?series=`
 * still redirects, so existing archive deep links still land on a search.
 *
 * Query-param views (not new paths) keep the edge Worker serving 200s via the
 * one known /materials route, and keep this page pre-rendered as the landing.
 */
// Any of these means the visitor came for a search (an old deep link into the
// materials-locked search view, which now lives on /search). The redirect then
// carries EVERY param across, not just these, so filters survive the move.
const SEARCH_PARAMS = ["q", "tags", "case_type", "sort", "page", "material_type", "date_from", "date_to"] as const;

export default function Materials() {
  const [searchParams] = useSearchParams();

  const series = searchParams.get("series");
  const hasSearchIntent = SEARCH_PARAMS.some((param) => searchParams.has(param));

  if (series) {
    return (
      <Suspense fallback={null}>
        <MaterialSeriesBrowse slug={series} />
      </Suspense>
    );
  }

  if (hasSearchIntent) {
    return <Navigate to={archiveSearchUrl("material", searchParams)} replace />;
  }

  return <MaterialsLanding />;
}
