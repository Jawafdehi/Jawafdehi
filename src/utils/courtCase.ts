/**
 * Pure derivations over a court-case record (parties, cause title).
 *
 * Kept out of the CourtCaseCard component so these can be reused (e.g. the
 * CourtCaseProfile tab title / JSON-LD) without importing a component module,
 * and so the component file only exports components (react-refresh clean).
 */

import type { CourtCase } from "@/types/jds";

// ── Defendant/Plaintiff from entities ────────────────────────────────────

export function getPartiesByRole(courtCase: CourtCase): {
  plaintiffs: string[];
  defendants: string[];
} {
  const plaintiffs: string[] = [];
  const defendants: string[] = [];

  // `entities` is only populated on the assembled "full" court case; the core
  // shape used on the case-detail page omits it. Default to [] so the string
  // plaintiff/defendant fallback below still renders instead of crashing.
  for (const entity of courtCase.entities ?? []) {
    const side = entity.side?.toLowerCase();
    if (side === "plaintiff" || side === "वादी") {
      plaintiffs.push(entity.name);
    } else if (side === "defendant" || side === "प्रतिवादी") {
      defendants.push(entity.name);
    }
  }

  // Fall back to string fields if entities list is empty
  if (plaintiffs.length === 0 && courtCase.plaintiff) {
    plaintiffs.push(courtCase.plaintiff);
  }
  if (defendants.length === 0 && courtCase.defendant) {
    defendants.push(courtCase.defendant);
  }

  return { plaintiffs, defendants };
}

// The court-case cause title — "<plaintiff> <versus> <defendant>" — the
// human-readable name for the case (e.g. "नेपाल सरकार विरुद्ध प्रतिवादी समेत २").
// Prefers the compact registry `plaintiff`/`defendant` strings (which already
// carry the "…समेत N" et-al form); falls back to the first entity per side, then
// to whichever single party is known. Returns null when neither party is known
// (callers fall back to the court/number identifier).
export function getCourtCaseCauseTitle(
  courtCase: CourtCase,
  versus: string,
): string | null {
  const { plaintiffs, defendants } = getPartiesByRole(courtCase);
  const plaintiff = courtCase.plaintiff?.trim() || plaintiffs[0] || "";
  const defendant = courtCase.defendant?.trim() || defendants[0] || "";
  if (plaintiff && defendant) return `${plaintiff} ${versus} ${defendant}`;
  return defendant || plaintiff || null;
}
