/**
 * Appeal-verdict presentation helpers.
 *
 * `appeal_verdicts` maps each appeal stage's court-case IRI to that docket's
 * raw `verdict_type`. It is a verdict on the DOCKET, not on any one defendant:
 * the CIAA often appeals only some of the accused, and for a partial reversal
 * we hold no Supreme Court order saying whose verdict changed. So a per-person
 * appeal line is only ever drawn on a single-accused case; every other case
 * gets one case-level sentence.
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

// Past-tense verbs for the case-level sentence.
const RESULT_VERBS: Record<AppealResult, { en: string; ne: string }> = {
  upheld: { en: "upheld", ne: "सदर गरेको छ" },
  overturned: { en: "overturned", ne: "उल्टी गरेको छ" },
  partly_overturned: { en: "partly overturned", ne: "केही उल्टी गरेको छ" },
};

type AppealVerdicts = Record<string, string | null> | null | undefined;

/** The reader-facing result for a raw verdict, or null (pending or unclassifiable). */
export function appealResult(verdictType: string | null | undefined): AppealResult | null {
  if (!verdictType) return null;
  return RESULT_BY_VERDICT[verdictType.trim().toUpperCase()] ?? null;
}

export function appealResultLabel(result: AppealResult, language: string): string {
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

/** Every decided appeal with a classified verdict, in stage order. */
export function decidedAppeals(
  dates: CaseDates | null | undefined,
  appealVerdicts: AppealVerdicts,
  language: string,
): DecidedAppeal[] {
  return caseStages(dates).flatMap((stage) => {
    const result = stageAppealResult(stage, appealVerdicts);
    if (!result) return [];
    const court = parseCourtCaseRef(stage.courtcase_iri)?.court;
    return [{ result, forum: court ? formatCourtName(court, language) : "" }];
  });
}

/**
 * The appeal result to draw on a defendant's own card, or null.
 *
 * Only when the case has exactly one accused and exactly one appeal stage, and
 * that appeal is decided: then the appeal can only have been about that
 * person. With several accused the docket verdict says nothing about any one
 * of them, and with several appeals there is no single line to draw.
 */
export function personalAppeal(
  entities: JawafEntity[],
  dates: CaseDates | null | undefined,
  appealVerdicts: AppealVerdicts,
  language: string,
): DecidedAppeal | null {
  const accused = entities.filter((e) => e.type === "accused");
  if (accused.length !== 1) return null;
  const appeals = caseStages(dates).filter((s) => s.stage === "appeal");
  if (appeals.length !== 1) return null;
  return decidedAppeals(dates, appealVerdicts, language)[0] ?? null;
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
    : "border-transparent bg-muted text-muted-foreground";
}

/** "Supreme Court: overturned" — the appeal named with the court that decided it. */
export function appealWithForumLabel(appeal: DecidedAppeal, language: string): string {
  const label = appealResultLabel(appeal.result, language);
  if (!appeal.forum) return label;
  return `${appeal.forum}: ${language === "ne" ? label : label.toLowerCase()}`;
}

/**
 * The case-level sentence shown above a multi-accused roster, e.g. "On appeal,
 * the Supreme Court upheld the Special Court's decision." `trialForum` is the
 * localized first-instance court, or null when there is not exactly one.
 */
export function appealSummarySentence(
  appeal: DecidedAppeal,
  trialForum: string | null,
  language: string,
): string {
  const ne = language === "ne";
  const verb = RESULT_VERBS[appeal.result][ne ? "ne" : "en"];
  if (ne) {
    const court = appeal.forum || "पुनरावेदन अदालत";
    const below = trialForum ? `${trialForum}को फैसला` : "तल्लो अदालतको फैसला";
    return `पुनरावेदनमा ${court}ले ${below} ${verb}।`;
  }
  const court = appeal.forum ? `the ${appeal.forum}` : "the appeal court";
  const below = trialForum ? `the ${trialForum}'s decision` : "the earlier decision";
  return `On appeal, ${court} ${verb} ${below}.`;
}

/** The caveat under the sentence: the docket verdict is not a per-person verdict. */
export function appealSummaryCaveat(
  result: AppealResult,
  trialForum: string | null,
  language: string,
): string {
  const ne = language === "ne";
  const scope =
    result === "partly_overturned"
      ? ne
        ? "कुन प्रतिवादीको हकमा फैसला बदलियो भनी देखाउने सर्वोच्च अदालतको पूर्ण फैसला हामीसँग छैन।"
        : "We do not hold the Supreme Court's full judgment, so we cannot say whose verdict changed."
      : ne
        ? "यो पुनरावेदनले तल सूचीकृत सबै प्रतिवादीलाई नसमेटेको हुन सक्छ।"
        : "The appeal may not cover every defendant listed below.";
  if (!trialForum) return scope;
  const below = ne ? `तलका फैसला ${trialForum}का हुन्।` : `The verdicts below are the ${trialForum}'s.`;
  return `${scope} ${below}`;
}
