import { useQuery } from "@tanstack/react-query";

import { archiveSeriesBySlug, committeeLeafBySlug } from "@/data/archive-folders";
import type { MaterialSeries } from "@/data/material-series";
import { documentSourcesQuery } from "@/lib/document-sources";

/**
 * The series a `?series=` slug names, for a filter chip or option. A Parliament
 * committee's sub-folder takes its committee's name from the catalogue
 * ("Finance Committee · Annual reports"), so only for such a slug is the
 * catalogue read (shared with /materials through the query cache); every
 * other slug resolves from the static shelves alone.
 */
export function useArchiveSeries(slug: string | undefined): MaterialSeries | undefined {
  const committee = Boolean(slug && committeeLeafBySlug(slug));
  const { data } = useQuery({ ...documentSourcesQuery(), enabled: committee });
  return slug ? archiveSeriesBySlug(slug, committee ? data : undefined) : undefined;
}
