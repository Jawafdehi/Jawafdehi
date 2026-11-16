/**
 * Browse-page series built from `/api/document-sources/` rows, for
 * `/materials/?source=<key>`. Kept apart from lib/document-sources so it lands
 * in the lazy browse chunk, not in the eager bundle the landing page ships.
 */

import type { MaterialSeries } from "@/data/material-series";
import {
  listedSources,
  type DocumentSourceEntry,
  type DocumentSourcesResponse,
} from "@/lib/document-sources";

/** The slug prefix that marks a series built from a source row, not the registry. */
export const SOURCE_SLUG_PREFIX = "source:";

/** The canonical browse URL for a series, curated or built from a source row. */
export function seriesBrowseHref(series: MaterialSeries): string {
  return series.slug.startsWith(SOURCE_SLUG_PREFIX)
    ? `/materials/?source=${encodeURIComponent(series.source)}`
    : `/materials/?series=${series.slug}`;
}

/** A stable folder tint per source key, so a source keeps its colour between visits. */
function tintFor(source: string): number {
  let hash = 0;
  for (const char of source) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 8) + 1;
}

/**
 * A browsable series for a source the curated registry does not cover, built
 * from its API row. Missing Nepali falls back to English when rendered
 * (pickLocalized), so an unlabelled half never shows as a blank.
 */
export function seriesFromDocumentSource(row: DocumentSourceEntry): MaterialSeries {
  const nameEn = row.name?.en ?? row.name?.ne ?? row.source;
  const publisherEn = row.publisher?.en ?? "";
  const descriptionEn = row.description || publisherEn;
  return {
    slug: `${SOURCE_SLUG_PREFIX}${row.source}`,
    source: row.source,
    tint: tintFor(row.source),
    name: { en: nameEn, ne: row.name?.ne ?? "" },
    description: {
      en: descriptionEn,
      // The API has no Nepali description field; the Nepali publisher name is
      // the best Nepali line it offers.
      ne: row.publisher?.ne ?? "",
    },
    typeLabel: { en: nameEn, ne: row.name?.ne ?? "" },
  };
}

/** The series for `/materials/?source=<key>`, or undefined if no listed source has that key. */
export function seriesForSourceKey(
  response: DocumentSourcesResponse | undefined | null,
  source: string,
): MaterialSeries | undefined {
  const row = listedSources(response).find((entry) => entry.source === source);
  return row ? seriesFromDocumentSource(row) : undefined;
}

