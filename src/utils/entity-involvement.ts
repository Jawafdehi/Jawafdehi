// SPDX-License-Identifier: Hippocratic-3.0
/**
 * What an entity's part in a case IS — role, verdict, appeal — worked out in
 * ONE place, because two things say it.
 *
 * The entity page's related-cases cards show it as badges, and the page's
 * search snippet says it in text. Those must never disagree: a snippet that
 * reads "अभियोग" while the page says "Special Court: acquitted" is the snippet
 * accusing someone the page clears. Same arrangement as `caseMetaDescription`
 * in `seo.ts`, for the same reason.
 */
import type { TFunction } from "i18next";

import type { Case } from "@/types/jds";
import { accusedAppeal, appealWithForumLabel } from "@/utils/appeal-verdict";
import { outcomeWithForumLabel, shouldShowOutcome } from "@/utils/case-outcome";
import { caseVerdictForum } from "@/utils/case-stages";

// Relationship role -> i18n label key. Mirrors the case-side relation labels so
// the reverse view reads the same as the forward (case detail) view.
export const ROLE_LABEL_KEY: Record<string, string> = {
  accused: "entityDetail.relationTypeAccused",
  alleged: "entityDetail.relationTypeAlleged",
  related: "entityDetail.relationTypeRelated",
  witness: "entityDetail.relationTypeWitness",
  opposition: "entityDetail.relationTypeOpposition",
  victim: "entityDetail.relationTypeVictim",
  respondent: "entityDetail.relationTypeRespondent",
  petitioner: "entityDetail.relationTypePetitioner",
  location: "entityDetail.relationTypeLocation",
};

// accused + alleged form the emphasized top tier (matches the server ordering).
export function isAccusedTier(role: string): boolean {
  return role === "accused" || role === "alleged";
}

// The date a card is ordered by — the same one it displays. Falls back to the
// record's creation time only when the case has no start date of its own.
function sortDateOf(caseItem: Case): string {
  return caseItem.proceedings_started_on || caseItem.created_at || "";
}

// This entity's role/verdict on a given case, read from the case's own entity
// binds (the list serializer resolves every bind's nes_id/type/outcome). When a
// case cites the entity in more than one role, prefer the accused/alleged bind
// so the badge matches why the card floated to the top.
export function roleFor(caseItem: Case, entityIri: string) {
  const binds = (caseItem.entities ?? []).filter((e) => e.nes_id === entityIri);
  const bind = binds.find((b) => isAccusedTier(b.type ?? "")) ?? binds[0];
  return { role: bind?.type ?? "related", outcome: bind?.outcome ?? null };
}

/**
 * accused/alleged first, then newest case first within each tier.
 *
 * Sort on the SAME date the card shows (`proceedings_started_on`, i.e. when
 * the case began) rather than `created_at` (when we happened to author the record).
 * Those orders are unrelated: this entity's five cases were authored in the
 * reverse of their real chronology, so ordering by `created_at` rendered the
 * dates on screen as an apparently random sequence.
 */
export function orderCasesForEntity(cases: readonly Case[], entityIri: string): Case[] {
  return [...cases].sort((a, b) => {
    const ra = isAccusedTier(roleFor(a, entityIri).role) ? 0 : 1;
    const rb = isAccusedTier(roleFor(b, entityIri).role) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return sortDateOf(b).localeCompare(sortDateOf(a));
  });
}

/** One entity's part in one case, as both the card and the snippet say it. */
export interface CaseInvolvement {
  role: string;
  outcome: ReturnType<typeof roleFor>["outcome"];
  accused: boolean;
  roleLabel: string;
  /** Whether a verdict is shown at all — only ever for an accused role. */
  showOutcome: boolean;
  /** "Special Court: acquitted" — never a bare verdict; see outcomeWithForumLabel. */
  outcomeText: string | null;
  appeal: ReturnType<typeof accusedAppeal> | null;
  appealText: string | null;
}

export function caseInvolvement(
  caseItem: Case,
  entityIri: string,
  language: string,
  t: TFunction,
): CaseInvolvement {
  const { role, outcome } = roleFor(caseItem, entityIri);
  const accused = isAccusedTier(role);
  const roleLabel = t(ROLE_LABEL_KEY[role] ?? "entityDetail.relationTypeUnknown");
  const showOutcome = accused && shouldShowOutcome(outcome);
  const outcomeText = showOutcome
    ? outcomeWithForumLabel(
        outcome,
        // `remanded` comes from the appeal court's order.
        outcome === "remanded" ? null : caseVerdictForum(caseItem.dates, language),
        language,
      )
    : null;
  // Same rule as the case page; see `accusedAppeal`.
  const bind = (caseItem.entities ?? []).find(
    (e) => e.nes_id === entityIri && e.type === "accused",
  );
  const appeal =
    showOutcome && bind
      ? accusedAppeal(
          bind,
          caseItem.entities ?? [],
          caseItem.dates,
          caseItem.appeal_verdicts,
          caseItem.appeal_parties,
          language,
        )
      : null;
  return {
    role,
    outcome,
    accused,
    roleLabel,
    showOutcome,
    outcomeText,
    appeal,
    appealText: appeal ? appealWithForumLabel(appeal, language) : null,
  };
}
