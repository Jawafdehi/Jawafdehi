import type { CourtChainStep } from "@/types/jds";

const COURTCASE_MARKER = "/courtcase/";

/** Below this, a single link is worded "probably", not stated plainly. */
export const PLAIN_LINK_THRESHOLD = 0.9;

/** `{court, caseNumber}` from a court case IRI, or null when it is not one. */
export function parseCourtCaseIri(iri: string): { court: string; caseNumber: string } | null {
  const at = iri.indexOf(COURTCASE_MARKER);
  if (at < 0) return null;
  const [court, caseNumber] = iri.slice(at + COURTCASE_MARKER.length).split("/");
  return court && caseNumber ? { court, caseNumber } : null;
}

export function courtCasePath(iri: string): string | null {
  const parts = parseCourtCaseIri(iri);
  return parts ? `/courtcase/${parts.court}/${encodeURIComponent(parts.caseNumber)}` : null;
}

/** "98%"; never rounds a link up to a certain 100% or down to 0%. */
export function percent(probability: number): string {
  const value = Math.round(probability * 100);
  return `${Math.min(99, Math.max(1, value))}%`;
}

export type LinkKind = "single" | "oneOf" | "eachOf";

/** The API states probabilities to three places; compare them at that precision. */
const thousandths = (value: number) => Math.round(value * 1000);

/**
 * How a step's sources read. The API derives a step's probability from its
 * sources (courts/appeal_links.py `probability`): an appeal of EACH of several
 * cases carries the lowest of theirs, while a set ("one of these") carries
 * their sum, capped at 1, which for two or more non-zero candidates is always
 * above the lowest. So the step equals its lowest source exactly when it is
 * each-of. No tolerance is applied: a skewed set such as 0.999 + 0.001 still
 * reads as a set.
 */
export function linkKind(step: CourtChainStep): LinkKind {
  const sources = step.appealed_from ?? [];
  if (sources.length <= 1) return "single";
  const lowest = Math.min(...sources.map((s) => thousandths(s.probability)));
  return thousandths(step.probability ?? 0) === lowest ? "eachOf" : "oneOf";
}
