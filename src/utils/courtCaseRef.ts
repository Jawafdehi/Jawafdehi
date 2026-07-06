/**
 * Friendly court-case-reference case URLs.
 *
 * A bare court case number in the path (e.g. /case/081-CR-0116) is redirected to
 * the canonical slug URL. The court identifier (special/supreme) is not part of
 * the URL, so we probe the known identifiers in order. Mirrors the legacy-numeric
 * redirect pattern in legacyCaseMap.ts (worker.ts edge 301 + CaseDetail
 * client-side fallback).
 */

// Bare court case number: digits-letters-digits (e.g. 081-CR-0116, 81-cr-116).
// Zero-padding / casing is normalised server-side by the cases API.
const COURT_REF_PATTERN = /^\d+-[A-Za-z]+-\d+$/;

// Court identifiers the cases API understands, probed in this order.
const COURT_IDENTIFIERS = ['special', 'supreme'] as const;

export function isCourtCaseRef(id: string | undefined): boolean {
  return id != null && COURT_REF_PATTERN.test(id);
}

/**
 * API lookup identifiers for a bare court ref, e.g.
 * ['special:081-CR-0116', 'supreme:081-CR-0116'].
 */
export function courtRefCandidates(ref: string): string[] {
  return COURT_IDENTIFIERS.map((court) => `${court}:${ref}`);
}

// Canonical court-case @id IRI (the form `Case.court_cases[]` carries):
// https://<host>/courtcase/<court>/<case_number>
const COURTCASE_IRI_RE = /^https?:\/\/[^/]+\/courtcase\/([^/]+)\/([^/]+)\/?$/;

export interface CourtCaseRefParts {
  court: string;
  caseNumber: string;
}

/**
 * Parse a court-case reference in either form — the canonical @id IRI
 * (`https://<host>/courtcase/special/081-cr-0116`) or the legacy
 * `<court>:<case_number>` short form. Returns null when it is neither.
 */
export function parseCourtCaseRef(
  ref: string | null | undefined,
): CourtCaseRefParts | null {
  if (!ref) return null;
  const trimmed = ref.trim();
  const iri = COURTCASE_IRI_RE.exec(trimmed);
  if (iri) {
    // Malformed percent-encoding throws URIError — this parser runs during
    // render and validation, so fail closed instead of crashing the UI.
    try {
      return {
        court: decodeURIComponent(iri[1]),
        caseNumber: decodeURIComponent(iri[2]),
      };
    } catch {
      return null;
    }
  }
  if (trimmed.includes('://')) return null;
  const idx = trimmed.indexOf(':');
  if (idx === -1) return null;
  const court = trimmed.slice(0, idx).trim();
  const caseNumber = trimmed.slice(idx + 1).trim();
  if (!court || !caseNumber) return null;
  // A slash would change the IRI's path structure (and the backend grammar
  // rejects it anyway) — treat such input as invalid here so the editor
  // flags the chip inline instead of building a malformed IRI.
  if (court.includes('/') || caseNumber.includes('/')) return null;
  return { court, caseNumber };
}

/**
 * Compact `<court>:<CASE-NUMBER>` spelling for a ref in either form (IRIs are
 * lowercase; case numbers read naturally uppercased). Null when unparseable.
 */
export function shortCourtCaseRef(ref: string | null | undefined): string | null {
  const parts = parseCourtCaseRef(ref);
  return parts ? `${parts.court}:${parts.caseNumber.toUpperCase()}` : null;
}

// The platform identity authority for @id IRIs. This is the IRI NAMESPACE
// (the same value in every environment), not the serving host.
export const COURTCASE_IRI_BASE = 'https://jawafdehi.org';

/**
 * Build the canonical court-case @id IRI (lowercased) from a ref in either
 * input form — a short `<court>:<number>` editor chip or an already-full IRI.
 * The API accepts canonical IRIs only, so the editor converts on submit.
 * Null when unparseable.
 */
export function courtCaseInputToIri(ref: string | null | undefined): string | null {
  const parts = parseCourtCaseRef(ref);
  if (!parts) return null;
  const court = parts.court.toLowerCase();
  const caseNumber = parts.caseNumber.toLowerCase();
  return `${COURTCASE_IRI_BASE}/courtcase/${court}/${caseNumber}`;
}
