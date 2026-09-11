/**
 * Case-stage helpers.
 *
 * A case's dates are a LIST of passes through forums, not one range: an
 * investigation, a first instance, appeals, reviews. Rendering rules live here
 * so the banner, the print sidebar and the verdict wording cannot drift.
 */

import type { CaseDates, CaseStage, CaseStageName } from "@/types/jds";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import { formatCourtName } from "@/utils/court-case-format";

/** The closed vocabulary, in the order the admin dropdown offers it. */
export const CASE_STAGE_NAMES: readonly CaseStageName[] = [
  "investigation",
  "initial",
  "appeal",
  "review",
  "other",
];

const STAGE_LABEL_KEYS: Record<CaseStageName, string> = {
  investigation: "caseDetail.stages.investigation",
  initial: "caseDetail.stages.initial",
  appeal: "caseDetail.stages.appeal",
  review: "caseDetail.stages.review",
  other: "caseDetail.stages.other",
};

export function isCaseStageName(value: unknown): value is CaseStageName {
  return (
    typeof value === "string" &&
    (CASE_STAGE_NAMES as readonly string[]).includes(value)
  );
}

/** The i18n key naming a stage. `other` overrides it with its own `label`. */
export function stageLabelKey(stage: CaseStageName): string {
  return STAGE_LABEL_KEYS[stage];
}

/**
 * The renderable stages of a case, in the order served.
 *
 * Deliberately NOT sorted: after a remand a new first instance legitimately
 * starts after an appeal ended, so any client-side ordering rule would lie.
 * Records outside the vocabulary are dropped — they have no label, and this is
 * the silent failure the admin editor's dropdown exists to prevent.
 */
export function caseStages(dates: CaseDates | null | undefined): CaseStage[] {
  const stages = dates?.stages;
  if (!Array.isArray(stages)) return [];
  return stages.filter(
    (stage): stage is CaseStage =>
      Boolean(stage) && typeof stage === "object" && isCaseStageName(stage.stage),
  );
}

/** A stage with no end date has not concluded. */
export function stageIsPending(stage: CaseStage): boolean {
  return !stage.end || stage.end.trim() === "";
}

/** Stages that happen in a court, and so can produce a verdict. Mirrors the
 * API's own COURT_STAGES; `investigation` and `other` decide nothing. */
const COURT_STAGE_NAMES: readonly CaseStageName[] = ["initial", "appeal", "review"];

/**
 * The court identifier of the case's ONE first-instance stage, or null.
 *
 * Null when there is no `initial` stage (a Supreme Court writ, where the
 * Supreme Court is the first instance), when there are several (naming one of
 * 8 courts would be a guess), or when the stage cites no court case.
 *
 * Also null once ANY OTHER court stage has concluded. A defendant's `outcome`
 * is a per-bind field with no forum of its own, and a terminal verdict is
 * written from whatever primary court order was read — an appellate order
 * included. So on a case whose appeal has been decided, the first instance is
 * no longer provably where the verdict came from, and attributing it there
 * would state something false about a named person. A still-PENDING appeal
 * cannot have produced a verdict, so it does not disqualify the attribution —
 * which is the 22-case shape this wording exists for.
 */
export function soleInitialCourt(
  dates: CaseDates | null | undefined,
): string | null {
  const stages = caseStages(dates);
  const initial = stages.filter((stage) => stage.stage === "initial");
  if (initial.length !== 1) return null;

  const decidedElsewhere = stages.some(
    (stage) =>
      stage !== initial[0] &&
      COURT_STAGE_NAMES.includes(stage.stage) &&
      !stageIsPending(stage),
  );
  if (decidedElsewhere) return null;

  return parseCourtCaseRef(initial[0].courtcase_iri)?.court ?? null;
}

/**
 * The localized court name a per-defendant verdict is attributed to, or null.
 *
 * Verdicts read "Special Court: acquitted" — naming the forum and asserting
 * nothing about finality. Null whenever the forum cannot be established:
 * no single first instance, or a later court stage that has already decided
 * (see `soleInitialCourt`). Then the verdict is shown bare rather than pinned
 * on a court that may not have reached it.
 */
export function caseVerdictForum(
  dates: CaseDates | null | undefined,
  language: string,
): string | null {
  const court = soleInitialCourt(dates);
  return court ? formatCourtName(court, language) : null;
}
