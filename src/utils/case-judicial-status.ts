/**
 * Where a case currently sits in the courts.
 *
 * Distinct from a defendant's `outcome`: the outcome says what happened to a
 * *person* ("Convicted"), this says what stage the *case* has reached ("decided
 * by the Special Court", "on appeal at the Supreme Court"). A reader scanning an
 * entity's case list wants the second one — an acquittal that the CIAA has since
 * appealed is not a closed matter, and the outcome chip alone implies it is.
 *
 * Labels are keyed by `language` directly rather than through i18next, matching
 * `case-outcome.ts`, so they render correctly under SSR/pre-render.
 */

import type { Case } from "@/types/jds";

export type JudicialStatus =
  | "supreme_appeal"
  | "special_decided"
  | "special_pending";

const STATUS_LABELS: Record<JudicialStatus, { en: string; ne: string }> = {
  supreme_appeal: {
    en: "Appeal registered at the Supreme Court",
    ne: "सर्वोच्च अदालतमा पुनरावेदन दर्ता",
  },
  special_decided: {
    en: "Decided by the Special Court",
    ne: "विशेष अदालतबाट फैसला भइसकेको",
  },
  special_pending: {
    en: "Hearing ongoing at the Special Court",
    ne: "विशेष अदालतमा सुनुवाइ भइरहेको",
  },
};

// Drawn from the two Jawafdehi brand colours rather than generic UI greys:
// --accent is the brand crimson, --primary the brand navy.
//
// An appeal is the live, contested state and the most newsworthy thing a card
// can say, so it takes the crimson. A concluded case takes the navy: present and
// authoritative, but not shouting. A pending hearing borrows the same amber the
// `charged` outcome already uses, since both mean "not resolved yet".
//
// Each carries a visible border rather than `border-transparent` — on a card
// that already sits on a muted surface, a tint alone was what made these read as
// washed out.
const STATUS_BADGE_CLASSES: Record<JudicialStatus, string> = {
  // --accent-on-dark is the brand crimson lightened for dark surfaces; it has no
  // Tailwind utility, so it is referenced as an arbitrary value the same way
  // Footer.tsx does.
  supreme_appeal:
    "border-accent/30 bg-accent/10 font-semibold text-accent dark:border-[hsl(var(--accent-on-dark))]/40 dark:bg-[hsl(var(--accent-on-dark))]/15 dark:text-[hsl(var(--accent-on-dark))]",
  special_decided:
    "border-primary/25 bg-primary/10 font-semibold text-primary dark:border-primary/40 dark:bg-primary/25 dark:text-foreground",
  special_pending:
    "border-alert-strong/30 bg-alert-strong/10 font-semibold text-alert-strong dark:border-alert-strong/40 dark:bg-alert-strong/25 dark:text-alert-strong",
};

// A Supreme Court reference only means an APPEAL when it carries a criminal
// (`-cr-`) registration number. The other Supreme Court routes in the archive
// are writs and revisions — `-wo-`/`-wf-`/`-wc-` (writ) and `-wh-`/`-re-`
// (habeas corpus, revision) — as seen on the Ncell, Giribandhu and Rabi
// Lamichhane records. Those reached the Supreme Court without anyone appealing a
// Special Court verdict, so labelling them "पुनरावेदन दर्ता" would be wrong.
const SUPREME_APPEAL_IRI = /\/courtcase\/supreme\/[^/]*-cr-/i;

function hasSupremeAppeal(courtCases: string[] | null | undefined): boolean {
  return (courtCases ?? []).some((iri) => SUPREME_APPEAL_IRI.test(iri ?? ""));
}

// Outcomes that mean a verdict has been handed down. `charged` does not.
const DECIDED_OUTCOMES = new Set(["convicted", "acquitted", "abated"]);

/**
 * Classify a case's judicial stage.
 *
 * Precedence is deliberate: an appeal outranks the verdict below it, because the
 * Special Court's decision is no longer the final word once it has been appealed.
 *
 * `case_end_date` is the primary signal for a decided case — it is the date the
 * case concluded. `outcome` is a secondary signal for the same thing: a case can
 * carry a recorded verdict for this entity while its end date is still blank, and
 * showing "hearing ongoing" next to "Convicted" would contradict itself.
 */
export function judicialStatusOf(
  caseItem: Pick<Case, "court_cases" | "case_end_date">,
  outcome?: string | null,
): JudicialStatus {
  if (hasSupremeAppeal(caseItem.court_cases)) return "supreme_appeal";
  if (caseItem.case_end_date) return "special_decided";
  if (outcome && DECIDED_OUTCOMES.has(String(outcome).toLowerCase())) {
    return "special_decided";
  }
  return "special_pending";
}

export function judicialStatusLabel(
  status: JudicialStatus,
  language: string,
): string {
  return STATUS_LABELS[status][language === "ne" ? "ne" : "en"];
}

export function judicialStatusBadgeClass(status: JudicialStatus): string {
  return STATUS_BADGE_CLASSES[status];
}
