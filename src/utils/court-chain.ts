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

/**
 * How a step's sources read. Several sources are a set ("one of these") when
 * every candidate is less likely than the step itself, whose probability is
 * their sum; otherwise the appeal is of each of them (the step carries the
 * lowest of theirs).
 */
export function linkKind(step: CourtChainStep): LinkKind {
  const sources = step.appealed_from ?? [];
  if (sources.length <= 1) return "single";
  const whole = step.probability ?? 0;
  return sources.every((s) => s.probability < whole - 0.0005) ? "oneOf" : "eachOf";
}
