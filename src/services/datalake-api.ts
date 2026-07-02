/**
 * Data Lake API Client (judicial materials + court cases)
 *
 * Data-lake records live on the Think-Big monolith under the SINGLE unified
 * `/api` root. Reads are public — materials and court cases are derived from
 * public-domain government documents.
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
  [key: string]: unknown;
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

/**
 * Parse a court-case ref into its composite key. Refs travel as `<court>:<number>`
 * (e.g. `special:081-CR-0060`, the form `Case.court_cases[]` carries); a bare number
 * with no court prefix is returned with an empty court.
 */
export function parseCourtCaseRef(ref: string): { court: string; caseNumber: string } {
  const idx = ref.indexOf(':');
  if (idx === -1) return { court: '', caseNumber: ref };
  return { court: ref.slice(0, idx), caseNumber: ref.slice(idx + 1) };
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
 * shaped for CourtCaseCard. Accepts a `<court>:<number>` ref or explicit pair.
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
