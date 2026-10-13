/**
 * Data Lake API Client (judicial materials + court cases)
 *
 * Data-lake records live on the Think-Big monolith under the SINGLE unified
 * `/api` root. Reads are public — materials and court cases are derived from
 * public government records.
 *
 *   GET /api/materials/<source>/<ident>          -> material JSON-LD (schema.org)
 *   GET /api/courtcases/<court>/<case_number>/   -> court case (composite key)
 *   GET /api/courtcases/<court>/<case_number>/{hearings,entities,documents}
 *
 * Auth, base-URL resolution, and error extraction are handled by the shared
 * `http` client (./http) — the ONE axios instance every service layer shares.
 * Call sites pass FULL `/api/...` paths.
 */

import { http, extractErrorMessage } from './http';
import { JDSApiError } from './jds-api';
import { parseCourtCaseRef as parseRefParts } from '@/utils/courtCaseRef';
import type { CourtCase, CourtCaseHearing, CourtCaseEntity } from '@/types/jds';

// A material @id IRI path component (`<source>/<ident>`) or a full IRI. The detail
// route is a splat, so the tail may already be the `<source>/<ident>` form.
const MATERIAL_MARKER = '/material/';

/** Same-origin material path tail (`<source>/<ident>`) from an IRI or bare tail. */
export function materialTail(iriOrTail: string): string {
  const i = iriOrTail.indexOf(MATERIAL_MARKER);
  return i === -1 ? iriOrTail : iriOrTail.slice(i + MATERIAL_MARKER.length);
}

/** Percent-encode each path segment of a tail, preserving the `/` separators. */
function encodeTail(tail: string): string {
  return tail.split("/").map(encodeURIComponent).join("/");
}

/**
 * A material is stored schema.org JSON-LD (bilingual language maps + a `jawafdehi:`
 * extension namespace), the same family as entities. We type only the spine and
 * keep an index signature for the type-specific long tail (rendered generically).
 */
export type MaterialBilingual = { en?: string | null; ne?: string | null };
export interface Material {
  '@id': string;
  '@type'?: string | string[];
  '@context'?: unknown;
  additionalType?: string;
  name?: MaterialBilingual | string;
  description?: MaterialBilingual | string;
  url?: string;
  sameAs?: string | string[];
  identifier?: string;
  dateCreated?: string;
  datePublished?: string;
  /**
   * What is inside this document, when we have parsed it. ABSENT — not zeroed —
   * when we have not: only a few dozen of ~346k materials carry it, and zeros
   * would claim we looked inside and found nothing.
   */
  'jawafdehi:content'?: MaterialContentSummary;
  [key: string]: unknown;
}

/**
 * One page of a source's materials. The list endpoint is cursor-paginated
 * with a FIXED server-side page size (`limit`/`page_size` are ignored) and no
 * text search or ordering controls — documents come newest-ingested first.
 * `count` is not in the response; the total for a source is the
 * /api/statistics/ `materials.by_source` figure.
 */
export interface MaterialListPage {
  next: string | null;
  previous: string | null;
  results: Material[];
}

/**
 * List a source's materials (`/api/materials/?source=…`), one cursor page at
 * a time. `cursor` is the opaque token from a previous page's `next` URL.
 */
export async function listMaterialsBySource(
  source: string,
  cursor?: string,
): Promise<MaterialListPage> {
  const endpoint = '/api/materials/';
  try {
    const response = await http.get<MaterialListPage>(endpoint, {
      params: { source, ...(cursor ? { cursor } : {}) },
    });
    return response.data;
  } catch (error) {
    handleDataLakeError(error, endpoint);
  }
}

/** The `cursor` param of a page's `next` URL, or null when it is the last. */
export function cursorFromNextUrl(next: string | null): string | null {
  if (!next) return null;
  try {
    return new URL(next, 'https://jawafdehi.org').searchParams.get('cursor');
  } catch {
    return null;
  }
}

/**
 * Retrieve a material's JSON-LD by its IRI path component (`<source>/<ident>`).
 * Accepts either the bare tail or a full material IRI.
 */
export async function getMaterial(iriOrTail: string): Promise<Material> {
  const tail = encodeTail(materialTail(iriOrTail));
  const endpoint = `/api/materials/${tail}`;
  try {
    const response = await http.get<Material>(endpoint);
    return response.data;
  } catch (error) {
    handleDataLakeError(error, endpoint);
  }
}

// ─── document content: pages, tables, figures ───────────────────────────────
//
// What is INSIDE a document, served by `/content?type=…` alongside the JSON-LD.
//
// Every shape comes in two sizes, and the split is the whole reason a 446-page
// report is browsable: a LISTING carries stubs with no page text and no table
// markdown, and one ITEM carries the heavy field. A single table reaches 170 KiB
// and a document's pages are its entire transcript, so a UI that rendered a
// listing in full would be unusable on exactly the documents worth reading.
//
// The counts come free on the material payload itself (`jawafdehi:content`), so
// deciding whether a document has content at all costs no extra request.

/** One datum of one chart. */
export interface ContentPoint {
  point_index: number;
  label: string;
  series: string;
  /** Null where the chart names a category but prints no value for it. */
  value: number | null;
  /**
   * True when this value was read off the chart image rather than a printed
   * figure. A weaker claim than an exact read, and the UI must say so — a single
   * chart routinely mixes both, which is why the flag is per point.
   */
  estimated: boolean;
}

export interface ContentFigure {
  /** Document order, for display. Recomputed on every ingest — never address by it. */
  ordinal: number;
  /** Stable handle (`p0018-f1`). Safe to put in a URL fragment or a React key. */
  key: string;
  uid: string;
  page_no: number;
  index_on_page: number;
  title: string;
  chart_type: string;
  unit: string;
  x_axis: string;
  y_axis: string;
  notes: string;
  verify_note: string;
  /** Null means "not checked", which is a different claim from "checked and failed". */
  verified: boolean | null;
  points: ContentPoint[];
}

/** A table as the listing returns it — everything but the markdown. */
export interface ContentTableStub {
  ordinal: number;
  /** Stable handle (`p0018-t1`); this is what `getMaterialTable` takes. */
  key: string;
  uid: string;
  page_no: number;
  index_on_page: number;
  caption: string;
  header: string[];
  n_rows: number;
  n_cols: number;
  fidelity: string;
}

export interface ContentTable extends ContentTableStub {
  markdown: string;
}

/** A page as the listing returns it — everything but the text. */
export interface ContentPageStub {
  page_no: number;
  uid: string;
  /**
   * What happened to this page. `anchored` was read from the PDF's own text
   * layer; `ocr_vision` by a vision model (weaker); anything else means little
   * or no text. An empty `text` is a statement about our OCR, not about the
   * page, so the UI must never render the two alike.
   */
  coverage_state: string;
  anchor_fidelity: string;
  ocr_source: string;
  landscape: boolean;
  n_table_blocks: number;
  chars: number;
}

export interface ContentPage extends ContentPageStub {
  text: string;
}

/** The counts the material payload carries at `jawafdehi:content`. */
export interface MaterialContentSummary {
  pages: number;
  pages_read: number;
  tables: number;
  figures: number;
  points: number;
  provenance: {
    doc_id: string;
    dataset: string;
    dataset_revision: string;
    text_source: string;
    transcript_verdict: string;
    figures_verdict: string;
    ingested_at: string;
  };
}

interface ContentList<T> {
  material: string;
  type: string;
  count: number;
  items: T[];
}

interface ContentItem<T> {
  material: string;
  type: string;
  item: T;
}

function contentEndpoint(iriOrTail: string): string {
  return `/api/materials/${encodeTail(materialTail(iriOrTail))}/content`;
}

/**
 * GET one `/content` shape, resolving 404 to `null`.
 *
 * A 404 here means "this material has no stored content at all", which is the
 * common case — most materials are a single scraped page. That is not an error
 * and must not surface as one: the caller simply renders nothing. Any other
 * failure still throws.
 */
async function getContent<T>(endpoint: string, params: Record<string, string | number>) {
  try {
    const response = await http.get<T>(endpoint, { params });
    return response.data;
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404) {
      return null;
    }
    handleDataLakeError(error, endpoint);
  }
}

/**
 * Every table in a document, WITHOUT its markdown.
 *
 * The split is the whole reason this is usable: one report's tables come to
 * ~830 KiB of markdown and a single table reaches 170 KiB, so the listing is
 * what a reader browses and `getMaterialTable` is what they open.
 */
export async function listMaterialTables(iriOrTail: string) {
  const data = await getContent<ContentList<ContentTableStub>>(contentEndpoint(iriOrTail), {
    type: "table",
  });
  return data?.items ?? null;
}

/**
 * One table, markdown included. `key` is the listing's `key` (`p0018-t1`), NOT
 * its `ordinal`: ordinals are recomputed on every ingest, so addressing by one
 * would eventually resolve to a different table.
 */
export async function getMaterialTable(iriOrTail: string, key: string) {
  const data = await getContent<ContentItem<ContentTable>>(contentEndpoint(iriOrTail), {
    type: "table",
    id: key,
  });
  return data?.item ?? null;
}

/** Every figure, each with its full series inline — the corpus total is ~6k points. */
export async function listMaterialFigures(iriOrTail: string) {
  const data = await getContent<ContentList<ContentFigure>>(contentEndpoint(iriOrTail), {
    type: "figure",
  });
  return data?.items ?? null;
}

/** Every page, WITHOUT its text. This is the document's table of contents. */
export async function listMaterialPages(iriOrTail: string) {
  const data = await getContent<ContentList<ContentPageStub>>(contentEndpoint(iriOrTail), {
    type: "page",
  });
  return data?.items ?? null;
}

/** One page's transcript, addressed by its PRINTED folio — checkable against the PDF. */
export async function getMaterialPage(iriOrTail: string, pageNo: number) {
  const data = await getContent<ContentItem<ContentPage>>(contentEndpoint(iriOrTail), {
    type: "page",
    num: pageNo,
  });
  return data?.item ?? null;
}

/**
 * Parse a court-case lookup id into its composite key. Ids are the canonical
 * @id IRI (`https://<host>/courtcase/special/081-cr-0060`, the only form
 * `Case.court_cases[]` carries) or an INTERNAL `<court>:<number>` lookup key
 * (what `courtRefCandidates` builds when probing a bare number from the URL —
 * a URL-construction detail, not a reference format); a bare number with no
 * court is returned with an empty court.
 */
export function parseCourtCaseRef(ref: string): { court: string; caseNumber: string } {
  const parts = parseRefParts(ref);
  if (parts) return { court: parts.court, caseNumber: parts.caseNumber };
  if (!ref.includes('://')) {
    const idx = ref.indexOf(':');
    if (idx > 0 && idx < ref.length - 1) {
      return { court: ref.slice(0, idx), caseNumber: ref.slice(idx + 1) };
    }
  }
  return { court: '', caseNumber: ref };
}

/**
 * Retrieve a court case by its composite key from the data-lake read plane.
 * Accepts either a `<court>:<number>` ref or explicit court + caseNumber.
 */
export async function getCourtCase(ref: string): Promise<CourtCase>;
export async function getCourtCase(court: string, caseNumber: string): Promise<CourtCase>;
export async function getCourtCase(courtOrRef: string, caseNumber?: string): Promise<CourtCase> {
  const { court, caseNumber: number } =
    caseNumber === undefined
      ? parseCourtCaseRef(courtOrRef)
      : { court: courtOrRef, caseNumber };
  // Composite-key detail route is /courtcases/<court>/<case_number>/ (mounted at
  // /api/), NOT nested under /courts/. Case numbers contain hyphens but no
  // slashes; encode each segment.
  const endpoint = `/api/courtcases/${encodeURIComponent(court)}/${encodeURIComponent(number)}/`;
  try {
    const response = await http.get<CourtCase>(endpoint);
    return response.data;
  } catch (error) {
    handleDataLakeError(error, endpoint);
  }
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Fetch a composite-key sub-resource list (hearings/entities), unwrapping pages. */
async function getCaseSubResource<T>(
  court: string,
  caseNumber: string,
  sub: 'hearings' | 'entities' | 'documents',
): Promise<T[]> {
  const endpoint = `/api/courtcases/${encodeURIComponent(court)}/${encodeURIComponent(caseNumber)}/${sub}`;
  try {
    const response = await http.get<Paginated<T> | T[]>(endpoint);
    const data = response.data;
    return Array.isArray(data) ? data : (data.results ?? []);
  } catch (error) {
    handleDataLakeError(error, endpoint);
  }
}

/**
 * Retrieve a FULL court case: the composite-key core plus its hearings and
 * party entities (separate sub-resource endpoints), assembled into one CourtCase
 * shaped for CourtCaseDetails. Accepts a `<court>:<number>` ref or explicit pair.
 */
export async function getCourtCaseFull(ref: string): Promise<CourtCase>;
export async function getCourtCaseFull(court: string, caseNumber: string): Promise<CourtCase>;
export async function getCourtCaseFull(courtOrRef: string, caseNumber?: string): Promise<CourtCase> {
  const { court, caseNumber: number } =
    caseNumber === undefined
      ? parseCourtCaseRef(courtOrRef)
      : { court: courtOrRef, caseNumber };
  // The core case MUST load (it determines whether the case exists / the page
  // 404s). Hearings + entities are supplementary: a flaky or empty sub-resource
  // must NOT tank an otherwise-valid page, so they degrade to [] on failure.
  const core = await getCourtCase(court, number);
  const [hearings, entities] = await Promise.all([
    getCaseSubResource<CourtCaseHearing>(court, number, 'hearings').catch(() => []),
    getCaseSubResource<CourtCaseEntity>(court, number, 'entities').catch(() => []),
  ]);
  return { ...core, hearings, entities };
}

/** Normalize an axios/unknown error into a JDSApiError (shared error shape). */
function handleDataLakeError(error: unknown, endpoint: string): never {
  const message = extractErrorMessage(error, 'Unknown error occurred');
  const statusCode = (error as { response?: { status?: number } })?.response?.status;
  throw new JDSApiError(
    `Data Lake API Error: ${message}`,
    statusCode,
    endpoint,
    error instanceof Error ? error : undefined,
  );
}
