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

import { MATERIAL_SERIES } from "@/data/material-series";
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

/** A bilingual label in the reader's language, falling back to the other one. */
export function pickLabel(label: BilingualLabel | null | undefined, language: string): string {
  const nepali = Boolean(language?.startsWith("ne"));
  return (nepali ? label?.ne || label?.en : label?.en || label?.ne) ?? "";
}

/** The source's own name for a reader, falling back across languages. */
export function documentSourceLabel(
  response: DocumentSourcesResponse | undefined | null,
  source: string,
  language: string,
): { name: string; publisher: string } | null {
  const row = response?.sources.find((entry) => entry.source === source);
  if (!row || !row.labelled) return null;
  return { name: pickLabel(row.name, language), publisher: pickLabel(row.publisher, language) };
}
