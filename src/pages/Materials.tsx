import { lazy, Suspense } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import { archiveSearchUrl } from "@/lib/archive-redirect";
import { lazyChunk } from "@/lib/chunk-reload";

import MaterialsLanding from "./MaterialsLanding";

// The landing view is what /materials pre-renders; ?series= and ?source= are
// client-rendered only, and they are the one variant with code of its own
// (filter panel, sheet, select). Behind a dynamic import that is off the entry
// chunk.
const MaterialSeriesBrowse = lazy(lazyChunk(() => import("./MaterialSeriesBrowse"), (m) => m.default));

/**
 * /materials is the archive's landing page plus the folder browser's leaves:
 *
 *   /materials/                → the landing page (pre-rendered), with the
 *                                archive folder browser (?path=, ?view=)
 *   /materials/?series=<slug>  → one series' browse page — a leaf folder of
 *                                the archive browser — which owns `q`/`sort`
 *                                and the date range WITHIN that series
 *   /materials/?source=<key>   → the same browse page for one whole source,
 *                                labelled from /api/document-sources/
 *   /materials/?q=…&tags=…&…   → /search?type=material&q=…, the archive search
 *
 * Every param is carried across to the search (see archiveSearchUrl), so a
 * shared link to a filtered search still opens on the same documents.
 */
// Any of these (without ?series=/?source=) means the visitor came for a search,
// not the landing. The redirect carries EVERY param, so filters survive the move.
const SEARCH_PARAMS = [
  "q",
  "tags",
  "case_type",
  "sort",
  "page",
  "material_type",
  "date_from",
  "date_to",
] as const;

export default function Materials() {
  const [searchParams] = useSearchParams();

  const series = searchParams.get("series");
  const source = searchParams.get("source");

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

  const hasSearchIntent = SEARCH_PARAMS.some((param) => searchParams.has(param));

  if (hasSearchIntent) {
    return <Navigate to={archiveSearchUrl("material", searchParams)} replace />;
  }

  return <MaterialsLanding />;
}
