import { Navigate, useSearchParams } from "react-router-dom";

import { archiveSearchUrl } from "@/lib/archive-redirect";

import MaterialsLanding from "./MaterialsLanding";

/**
 * /materials is the archive's landing page with its folder browser (?path=,
 * ?view=). Everything else opens the archive search on Documents:
 *
 *   /materials/?series=<slug>  → /search?type=material&series=<slug>
 *   /materials/?source=<key>   → /search?type=material&source=<key>
 *   /materials/?q=…&tags=…&…   → /search?type=material&q=…
 *
 * A folder has no page of its own; it is the search with its scope applied.
 * Every param is carried across (archiveSearchUrl), so a shared link to a
 * series or a filtered search still opens on the same documents.
 */
const SEARCH_PARAMS = [
  "series",
  "source",
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

  if (SEARCH_PARAMS.some((param) => searchParams.has(param))) {
    return <Navigate to={archiveSearchUrl("material", searchParams)} replace />;
  }

  return <MaterialsLanding />;
}
