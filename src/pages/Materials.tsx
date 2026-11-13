import { archiveSearchUrl } from "@/lib/archive-redirect";
import { Navigate, useSearchParams } from "react-router-dom";

import MaterialsLanding from "./MaterialsLanding";

/**
 * /materials is the archive's landing page and nothing else. Its two older
 * views now live on the archive search:
 *
 *   /materials/                → the landing page (pre-rendered)
 *   /materials/?series=<slug>  → /search?type=material&series=<slug>, the
 *                                series as a filter on the Documents tab
 *   /materials/?q=…&tags=…&…   → /search?type=material&q=…, as before
 *
 * Every param is carried across (see archiveSearchUrl), so a shared link to a
 * filtered shelf still opens on the same documents.
 */
// Any of these means the visitor came for a search, not the landing. The
// redirect carries EVERY param, not just these, so filters survive the move.
const SEARCH_PARAMS = [
  "series",
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
  const hasSearchIntent = SEARCH_PARAMS.some((param) => searchParams.has(param));

  if (hasSearchIntent) {
    return <Navigate to={archiveSearchUrl("material", searchParams)} replace />;
  }

  return <MaterialsLanding />;
}
