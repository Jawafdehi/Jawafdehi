/**
 * Every document source in the archive, live from `GET /api/document-sources/`.
 *
 * The curated shelves in data/material-series.ts are an editorial short list.
 * They used to be the only way into the archive from /materials, so a source
 * the API gained later (Revenue Investigation, SEBON, NRB, cabinet decisions…)
 * had no way in except a lucky search. Sources moved from a hard-coded list to
 * a database model in the API (JAW-57), and that endpoint lists every one of
 * them with its label and live count. This module turns those rows into
 * things the page can render and browse, so a source added in the admin shows
 * up here with no frontend release.
 */

import { MATERIAL_SERIES, type MaterialSeries } from "@/data/material-series";
import { getDocumentSources } from "@/services/jds-api";

export interface BilingualLabel {
  en?: string | null;
  ne?: string | null;
}

/** One row of `/api/document-sources/`. Fields the page does not use are omitted. */
export interface DocumentSourceEntry {
  /** The material source token, the `<source>` segment of /material/<source>/<ident>. */
  source: string;
  name: BilingualLabel | null;
  publisher: BilingualLabel | null;
  description?: string | null;
  /** False when staff have not named the source yet; such rows are not listed. */
  labelled: boolean;
  /** Documents visible to the public under this source. */
  count: number;
}

export interface DocumentSourcesResponse {
  /** False while the statistics snapshot behind the counts is still building. */
  ready: boolean;
  sources: DocumentSourceEntry[];
}

/** Shared by the landing page, the per-source browse view and the SSR prefetch. */
export function documentSourcesQuery() {
  return {
    queryKey: ["document-sources"] as const,
    queryFn: getDocumentSources,
  };
}

/**
 * The sources worth a link: named, and holding at least one public document.
 * The API already orders them by count, largest first, and that order is kept.
 */
export function listedSources(response: DocumentSourcesResponse | undefined | null): DocumentSourceEntry[] {
  return (response?.sources ?? []).filter(
    (row) => row.labelled && Boolean(row.name?.en || row.name?.ne) && row.count > 0,
  );
}

/** The slug prefix that marks a series built from a source row, not the registry. */
const SOURCE_SLUG_PREFIX = "source:";

/**
 * Where to browse one source. A source that a curated shelf covers whole
 * (one shelf, no kind narrowing) links to that shelf, keeping its editorial
 * wording. Every other source gets the generic per-source view.
 */
export function sourceBrowseHref(source: string): string {
  const curated = MATERIAL_SERIES.filter((series) => series.source === source);
  if (curated.length === 1 && !curated[0].kind && !curated[0].kindExclude) {
    return `/materials/?series=${curated[0].slug}`;
  }
  return `/materials/?source=${encodeURIComponent(source)}`;
}

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

/** The source's own name for a reader, falling back across languages. */
export function documentSourceLabel(
  response: DocumentSourcesResponse | undefined | null,
  source: string,
  language: string,
): { name: string; publisher: string } | null {
  const row = response?.sources.find((entry) => entry.source === source);
  if (!row || !row.labelled) return null;
  const nepali = Boolean(language?.startsWith("ne"));
  const pick = (label: BilingualLabel | null) =>
    (nepali ? label?.ne || label?.en : label?.en || label?.ne) ?? "";
  return { name: pick(row.name), publisher: pick(row.publisher) };
}
