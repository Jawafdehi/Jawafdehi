// SPDX-License-Identifier: Hippocratic-3.0
import type { CourtCase } from "@/types/jds";

import { caseDecision, VERDICT_LABELS } from "./court-hearing-label";
import { formatCourtName } from "./court-case-format";
import { truncateMeta } from "./seo";

type MetaSource = Pick<
  CourtCase,
  | "case_number"
  | "case_type"
  | "case_status"
  | "registration_date_bs"
  | "verdict_date_bs"
  | "verdict_type"
  | "hearings"
>;

/**
 * The outcome of a court case as a searcher should read it in a result, or
 * null when we cannot say.
 *
 * Prefers the court's own words (see `caseDecision`), then our label for the
 * structured `verdict_type`, then the register's raw status line. Never
 * invents one: "absence of evidence is not चलिरहेको".
 */
function outcomeText(courtCase: MetaSource): string | null {
  const { outcome, source } = caseDecision(courtCase);
  if (outcome && source === "verdict_type") return VERDICT_LABELS[outcome]?.ne ?? null;
  if (outcome) return outcome;
  const status = courtCase.case_status?.trim();
  return status ? status : null;
}

/**
 * Title and meta description for a court-case page.
 *
 * Every one of 19,217 court-case pages used to carry the same description —
 * "Court case <number> in the Jawafdehi governance archive." — which tells a
 * searcher nothing and reads to a search engine as near-duplicate content. This
 * builds both from the record: the charge, the court, the registration date and
 * the outcome.
 *
 * **The outcome is deliberately in the snippet.** A court record shows up for
 * the name of everyone in it, and a result that says "रकम हिनामिना" without
 * "सफाई" next to it accuses an acquitted person on our behalf. What a searcher
 * reads without clicking must carry the outcome whenever we have one.
 *
 * **Party names are deliberately NOT.** They are on the page when the API says
 * they may be (`names_public`), and that already makes them findable. Putting
 * them into every snippet is a separate editorial step this function does not
 * take on its own.
 *
 * Nepali-first, like the page: the court record is Nepali, and so is `<html
 * lang>` on every server-rendered page. The case number is Latin either way,
 * which is what someone holding a court reference searches for.
 */
export function courtCaseMeta(
  courtCase: MetaSource,
  court: string,
): { title: string; description: string } {
  const caseNumber = courtCase.case_number?.trim() ?? "";
  const charge = courtCase.case_type?.trim() || null;
  const courtName = formatCourtName(court, "ne") || null;

  const title = [
    [caseNumber, charge].filter(Boolean).join(" — "),
    courtName,
  ]
    .filter(Boolean)
    .join(" · ");

  const registered = courtCase.registration_date_bs?.trim();
  // The outcome LEADS. Everything after it is variable-length (a court's own
  // charge text can run to hundreds of characters), and truncation cuts from
  // the end — so with the outcome last, a long charge could keep the
  // accusation in the snippet and cut the acquittal off. First, it cannot be.
  const lead = [
    outcomeText(courtCase),
    charge,
    courtName,
    caseNumber ? `मुद्दा नं. ${caseNumber}` : null,
    registered ? `दर्ता ${registered}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${title || caseNumber} | Jawafdehi`,
    description: truncateMeta(
      `${lead}. अदालतको आफ्नै अभिलेखबाट पक्ष, सुनुवाइ र आदेशहरू — जवाफदेहीमा।`,
    ),
  };
}
