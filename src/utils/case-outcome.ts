/**
 * Verdict-outcome presentation helpers.
 *
 * A defendant's outcome is orthogonal to their relationship role: someone may be
 * `accused` (role) yet `acquitted` (outcome). These helpers map an outcome to a
 * localized label and a Tailwind badge style. Labels are keyed by `language`
 * directly (not via i18next) so they render correctly under SSR/pre-render, the
 * same pattern the surrounding case components use.
 *
 * `charged` is the implicit default under the "Accused" grouping, so it is
 * suppressed by default to avoid a noisy chip on every undecided accused — only
 * a DECIDED outcome is surfaced.
 */

import type { EntityOutcome } from "@/types/jds";

const OUTCOME_LABELS: Record<EntityOutcome, { en: string; ne: string }> = {
  convicted: { en: "Convicted", ne: "दोषी ठहर" },
  acquitted: { en: "Acquitted", ne: "सफाइ" },
  charged: { en: "Charged", ne: "अभियोग" },
  abated: { en: "Abated", ne: "मुद्दा तामेली" },
};

// Badge colours: convicted = red, acquitted = green (neutral-positive),
// charged = amber, abated = gray. Light + dark. The Badge component only ships
// default/secondary/destructive/outline variants, so these are className overrides.
const OUTCOME_BADGE_CLASSES: Record<EntityOutcome, string> = {
  convicted:
    "border-transparent bg-danger/10 text-danger dark:bg-danger/40 dark:text-danger",
  acquitted:
    "border-transparent bg-success-strong/10 text-success-strong dark:bg-success-strong/40 dark:text-success-strong",
  charged:
    "border-transparent bg-alert-strong/10 text-alert-strong dark:bg-alert-strong/40 dark:text-alert-strong",
  abated:
    "border-transparent bg-muted text-muted-foreground",
};

// Coerce any incoming value to a known outcome, defaulting to `charged`. Guards
// the lookups below against unexpected/cased values (e.g. a stray uppercase from
// the admin enum) so they can never index the maps with `undefined`.
function normalizeOutcome(outcome: string): EntityOutcome {
  const v = String(outcome).toLowerCase();
  return v === "convicted" || v === "acquitted" || v === "abated" || v === "charged"
    ? (v as EntityOutcome)
    : "charged";
}

/**
 * Sort weight for a verdict: decided outcomes first — convicted, then
 * acquitted, then abated — and undecided (`charged`, or none) last. Lower sorts
 * first.
 */
export function outcomeRank(outcome: EntityOutcome | null | undefined): number {
  if (!outcome) return 3;
  switch (normalizeOutcome(outcome)) {
    case "convicted":
      return 0;
    case "acquitted":
      return 1;
    case "abated":
      return 2;
    default:
      return 3;
  }
}

export function outcomeLabel(outcome: EntityOutcome, language: string): string {
  const lang = language === "ne" ? "ne" : "en";
  return OUTCOME_LABELS[normalizeOutcome(outcome)][lang];
}

/**
 * A verdict named with the forum that reached it: "Special Court: acquitted".
 *
 * NOT a bare "Acquitted", and NOT "acquitted — appeal pending". 22 published
 * cases carry a Special Court acquittal with a live CIAA appeal at the Supreme
 * Court, and the CIAA routinely appeals only SOME defendants, so any claim
 * about pendency is wrong for whoever it does not apply to. Naming the forum is
 * true for everyone. `forum` is empty when the case has no single first
 * instance to attribute the verdict to — then the bare verdict stands alone
 * rather than being pinned on a guessed court.
 */
export function outcomeWithForumLabel(
  outcome: EntityOutcome,
  forum: string | null | undefined,
  language: string,
): string {
  const label = outcomeLabel(outcome, language);
  const named = forum?.trim();
  if (!named) return label;
  // Devanagari is caseless; English reads as a sentence after the forum.
  return `${named}: ${language === "ne" ? label : label.toLowerCase()}`;
}

export function outcomeBadgeClass(outcome: EntityOutcome): string {
  return OUTCOME_BADGE_CLASSES[normalizeOutcome(outcome)];
}

/**
 * Whether to render a badge for this outcome. `charged`/undefined is the
 * undecided default and is suppressed; only decided outcomes render.
 */
export function shouldShowOutcome(
  outcome: EntityOutcome | undefined | null,
): outcome is EntityOutcome {
  return outcome != null && normalizeOutcome(outcome) !== "charged";
}
