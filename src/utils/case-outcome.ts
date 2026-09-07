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

export function outcomeLabel(outcome: EntityOutcome, language: string): string {
  const lang = language === "ne" ? "ne" : "en";
  return OUTCOME_LABELS[normalizeOutcome(outcome)][lang];
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
