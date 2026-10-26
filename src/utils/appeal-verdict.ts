/**
 * Appeal-verdict presentation helpers.
 *
 * `appeal_verdicts` maps each appeal stage's court-case IRI to that docket's
 * raw `verdict_type`. It is a verdict on the DOCKET, not on any one defendant:
 * the CIAA often appeals only some of the accused. `appeal_parties` says who was
 * on each docket, so on a multi-accused case an UPHELD appeal is drawn on the
 * cards of the accused who were on it. A reversal is not: we hold no Supreme
 * Court order saying what changed for whom.
 *
 * Labels are keyed by `language` directly, like `case-outcome`, so they render
 * under SSR/pre-render.
 */

import type { CaseDates, CaseStage, EntityOutcome, JawafEntity } from "@/types/jds";
import { outcomeBadgeClass } from "@/utils/case-outcome";
import { caseStages, stageIsPending } from "@/utils/case-stages";
import { parseCourtCaseRef } from "@/utils/courtCaseRef";
import { formatCourtName } from "@/utils/court-case-format";

export type AppealResult = "upheld" | "overturned" | "partly_overturned";

// CLAIM_DENIED on an appeal is `पुनरावेदन जिकिर नपुग्ने` — the appeal failed,
// so the decision below stands. Never show it as "claim denied".
const RESULT_BY_VERDICT: Record<string, AppealResult> = {
  AFFIRMED: "upheld",
  CLAIM_DENIED: "upheld",
  REVERSED: "overturned",
  PARTIALLY_REVERSED: "partly_overturned",
};

const RESULT_LABELS: Record<AppealResult, { en: string; ne: string }> = {
  upheld: { en: "Upheld", ne: "सदर" },
  overturned: { en: "Overturned", ne: "उल्टी" },
  partly_overturned: { en: "Partly overturned", ne: "केही उल्टी" },
};

type AppealVerdicts = Record<string, string | null> | null | undefined;
type AppealParties = Record<string, string[]> | null | undefined;

/** The reader-facing result for a raw verdict, or null (pending or unclassifiable). */
export function appealResult(verdictType: string | null | undefined): AppealResult | null {
  if (!verdictType) return null;
  return RESULT_BY_VERDICT[verdictType.trim().toUpperCase()] ?? null;
}

function appealResultLabel(result: AppealResult, language: string): string {
  return RESULT_LABELS[result][language === "ne" ? "ne" : "en"];
}

/** The result of one stage: null unless it is a decided appeal with a classified verdict. */
function stageAppealResult(
  stage: CaseStage,
  appealVerdicts: AppealVerdicts,
): AppealResult | null {
  if (stage.stage !== "appeal" || stageIsPending(stage) || !stage.courtcase_iri) return null;
  return appealResult(appealVerdicts?.[stage.courtcase_iri]);
}

export interface DecidedAppeal {
  result: AppealResult;
  /** The appeal court, localized ("Supreme Court"); empty when the IRI names none. */
  forum: string;
}

function toDecided(stage: CaseStage, result: AppealResult, language: string): DecidedAppeal {
  const court = parseCourtCaseRef(stage.courtcase_iri)?.court;
  return { result, forum: court ? formatCourtName(court, language) : "" };
}

/**
 * The appeal result to draw on one accused's card, or null.
 *
 * One accused, one appeal stage, decided: the appeal is theirs, whatever it
 * did -- unless the docket's resolved parties name other people and not them.
 *
 * Several accused: only an appeal they are listed on in `appealParties`, only
 * when there is exactly one such decided appeal, and only when it was upheld.
 * Upheld means nothing changed for anyone on the docket; a reversal on a
 * docket of several says nothing about what changed for this person.
 */
export function accusedAppeal(
  entity: JawafEntity,
  entities: JawafEntity[],
  dates: CaseDates | null | undefined,
  appealVerdicts: AppealVerdicts,
  appealParties: AppealParties,
  language: string,
): DecidedAppeal | null {
  if (entity.type !== "accused") return null;
  const appeals = caseStages(dates).filter((s) => s.stage === "appeal");
  const listed = (stage: CaseStage) =>
    !!entity.nes_id && (appealParties?.[stage.courtcase_iri ?? ""] ?? []).includes(entity.nes_id);

  if (entities.filter((e) => e.type === "accused").length === 1) {
    if (appeals.length !== 1) return null;
    const [stage] = appeals;
    const result = stageAppealResult(stage, appealVerdicts);
    if (!result) return null;
    const parties = appealParties?.[stage.courtcase_iri ?? ""] ?? [];
    if (parties.length > 0 && !listed(stage)) return null;
    return toDecided(stage, result, language);
  }

  const mine = appeals.filter((stage) => listed(stage) && stageAppealResult(stage, appealVerdicts));
  if (mine.length !== 1) return null;
  const result = stageAppealResult(mine[0], appealVerdicts);
  return result === "upheld" ? toDecided(mine[0], result, language) : null;
}

/**
 * The appeal pill's colour. Upheld keeps the verdict's colour, because the
 * verdict stands. A reversal is grey: repeating the verdict's red or green
 * would restate a verdict the court overturned, and we hold no judgment to
 * colour in a new one.
 */
export function appealBadgeClass(result: AppealResult, outcome: EntityOutcome): string {
  return result === "upheld"
    ? outcomeBadgeClass(outcome)
    : "border-transparent bg-secondary text-secondary-foreground";
}

/** "Supreme Court: overturned" — the appeal named with the court that decided it. */
export function appealWithForumLabel(appeal: DecidedAppeal, language: string): string {
  const label = appealResultLabel(appeal.result, language);
  if (!appeal.forum) return label;
  return `${appeal.forum}: ${language === "ne" ? label : label.toLowerCase()}`;
}
