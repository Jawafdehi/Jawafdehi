import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

import { getCasesCitingEntity } from "@/services/jds-api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDateForLanguage } from "@/utils/date";
import { formatBigo } from "@/utils/number";
import { getCaseTypeLabelKey } from "@/utils/case-entities";
import {
  outcomeBadgeClass,
  outcomeLabel,
  shouldShowOutcome,
} from "@/utils/case-outcome";
import {
  judicialStatusBadgeClass,
  judicialStatusLabel,
  judicialStatusOf,
} from "@/utils/case-judicial-status";
import type { Case } from "@/types/jds";

// Relationship role -> i18n label key. Mirrors the case-side relation labels so
// the reverse view reads the same as the forward (case detail) view.
const ROLE_LABEL_KEY: Record<string, string> = {
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

// First page only — the corpus is small and an entity rarely spans many cases.
const PAGE_SIZE = 20;

// Which court handed down the verdict, for the outcome chip.
//
// "Convicted" on its own does not say who convicted them, which matters most on
// exactly the cases where it is contested — a Special Court conviction under
// appeal is not the same claim as a settled one. Only qualify when the case
// actually cites a Special Court proceeding; the archive also holds Revenue
// Tribunal and writ matters, where "विशेष अदालतबाट" would be false.
const SPECIAL_COURT_IRI = /\/courtcase\/special\//i;

const SPECIAL_COURT_OUTCOME_KEY: Record<string, string> = {
  convicted: "entityDetail.outcomeConvictedSpecial",
  acquitted: "entityDetail.outcomeAcquittedSpecial",
};

// accused + alleged form the emphasized top tier (matches the server ordering).
function isAccusedTier(role: string): boolean {
  return role === "accused" || role === "alleged";
}

// The date a card is ordered by — the same one it displays. Falls back to the
// record's creation time only when the case has no start date of its own.
function sortDateOf(caseItem: Case): string {
  return caseItem.case_start_date || caseItem.created_at || "";
}

// This entity's role/verdict on a given case, read from the case's own entity
// binds (the list serializer resolves every bind's nes_id/type/outcome). When a
// case cites the entity in more than one role, prefer the accused/alleged bind
// so the badge matches why the card floated to the top.
function roleFor(caseItem: Case, entityIri: string) {
  const binds = (caseItem.entities ?? []).filter((e) => e.nes_id === entityIri);
  const bind = binds.find((b) => isAccusedTier(b.type ?? "")) ?? binds[0];
  return { role: bind?.type ?? "related", outcome: bind?.outcome ?? null };
}

/**
 * "Related cases" section for an entity record page: the published cases that
 * cite this entity, accused/alleged floated to the top and visually emphasized,
 * everything else reverse-chronologically below. Renders nothing when the entity
 * has no published citations (or on error), so it can be dropped in unconditionally.
 */
export function EntityRelatedCases({ entityIri }: { entityIri: string }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language === "ne" ? "ne" : "en";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["entity-related-cases", entityIri],
    queryFn: () => getCasesCitingEntity(entityIri, { page_size: PAGE_SIZE }),
    enabled: entityIri.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section aria-busy="true" className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-[4.5rem] w-full rounded-xl" />
        <Skeleton className="h-[4.5rem] w-full rounded-xl" />
      </section>
    );
  }

  // Hide the whole section when there are no published citations (or on error).
  if (isError || !data || data.count === 0) return null;

  // accused/alleged first, then newest case first within each tier.
  //
  // Sort on the SAME date the card shows (`case_start_date`, i.e. when the case
  // began) rather than `created_at` (when we happened to author the record).
  // Those orders are unrelated: this entity's five cases were authored in the
  // reverse of their real chronology, so ordering by `created_at` rendered the
  // dates on screen as an apparently random sequence.
  const cases = [...data.results].sort((a, b) => {
    const ra = isAccusedTier(roleFor(a, entityIri).role) ? 0 : 1;
    const rb = isAccusedTier(roleFor(b, entityIri).role) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return sortDateOf(b).localeCompare(sortDateOf(a));
  });

  const remaining = data.count - cases.length;

  return (
    <section aria-labelledby="related-cases-heading" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="related-cases-heading"
          className="text-xl font-semibold tracking-tight text-primary"
        >
          {t("entityDetail.relatedCases")}
        </h2>
        <span className="text-sm font-medium text-muted-foreground">{data.count}</span>
      </div>

      <ul className="space-y-3">
        {cases.map((c) => {
          const { role, outcome } = roleFor(c, entityIri);
          const accused = isAccusedTier(role);
          const roleLabel = t(
            ROLE_LABEL_KEY[role] ?? "entityDetail.relationTypeUnknown",
          );
          // Label the dates rather than printing a bare one. `case_start_date`
          // is when the case was filed and `case_end_date` when it was decided —
          // an unlabelled date left the reader guessing which they were seeing,
          // and on a decided case the filing date alone reads as stale.
          //
          // `created_at` is when WE authored the record, not a fact about the
          // case, so it is no longer used as a fallback: an authoring timestamp
          // presented as a case date is simply wrong. A case with no filing date
          // shows no date at all.
          // Bikram Sambat leads in the Nepali UI, Gregorian in the English one —
          // `formatDateForLanguage` is the shared helper the case surfaces
          // already use for this. The other calendar comes back as `secondary`
          // and is carried in `title`, so the Gregorian date stays available on
          // hover without a second date cluttering every row.
          //
          // These cases carry no curated BS override (only timeline entries have
          // `date_bs`), so the BS date is converted from the Gregorian one.
          const filed = c.case_start_date
            ? formatDateForLanguage(c.case_start_date, "PP", null, i18n.language)
            : null;
          const decided = c.case_end_date
            ? formatDateForLanguage(c.case_end_date, "PP", null, i18n.language)
            : null;
          const typeKey = getCaseTypeLabelKey(c.case_type);
          const typeLabel = typeKey ? t(typeKey) : c.case_type;
          const href = c.slug ? `/case/${c.slug}` : undefined;
          const status = judicialStatusOf(c, outcome);
          const inSpecialCourt = (c.court_cases ?? []).some((iri) =>
            SPECIAL_COURT_IRI.test(iri ?? ""),
          );
          const outcomeKey = String(outcome ?? "").toLowerCase();

          const row = (
            <div
              className={cn(
                "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-colors hover:border-border hover:bg-muted/50",
                accused && "border-l-4 border-l-accent",
              )}
            >
              {/* Title leads: it is what a reader scans for. The role/verdict
                  badges and the type · date · amount meta sit under it. */}
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="line-clamp-2 text-base font-semibold leading-snug text-primary group-hover:underline">
                  {c.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <Badge
                    variant={accused ? undefined : "secondary"}
                    className={cn(
                      "shrink-0",
                      accused && "border-transparent bg-accent text-accent-foreground",
                    )}
                  >
                    {roleLabel}
                  </Badge>
                  {accused && shouldShowOutcome(outcome) ? (
                    <Badge variant="outline" className={outcomeBadgeClass(outcome)}>
                      {inSpecialCourt && SPECIAL_COURT_OUTCOME_KEY[outcomeKey]
                        ? t(SPECIAL_COURT_OUTCOME_KEY[outcomeKey])
                        : outcomeLabel(outcome, language)}
                    </Badge>
                  ) : null}
                  {/* Where the case itself has got to, as opposed to what
                      happened to this person in it. */}
                  <Badge variant="outline" className={judicialStatusBadgeClass(status)}>
                    {judicialStatusLabel(status, language)}
                  </Badge>
                </div>

                <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-muted-foreground">{typeLabel}</dt>
                  </div>
                  {filed ? (
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-muted-foreground">
                        {t("entityDetail.relatedCaseFiled")}:
                      </dt>
                      <dd
                        className="font-medium text-foreground"
                        title={filed.secondary ?? undefined}
                      >
                        {filed.primary}
                      </dd>
                    </div>
                  ) : null}
                  {decided ? (
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-muted-foreground">
                        {t("entityDetail.relatedCaseDecided")}:
                      </dt>
                      <dd
                        className="font-medium text-foreground"
                        title={decided.secondary ?? undefined}
                      >
                        {decided.primary}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {/* The bigo line renders on EVERY card so the figure is always
                    in the same place and its absence is legible as a gap in the
                    record rather than an oversight.
                    `formatBigo(0)` is the literal "Rs 0", so a falsy bigo is
                    reported as unrecorded — a missing amount is not a
                    zero-rupee case. */}
                <p className="text-sm">
                  <span className="text-muted-foreground">{t("caseCard.bigo")}: </span>
                  {c.bigo ? (
                    <span className="font-semibold tabular-nums text-accent">
                      {formatBigo(c.bigo)}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground">
                      {t("entityDetail.relatedCaseBigoUnknown")}
                    </span>
                  )}
                </p>
              </div>
              {href ? (
                <ArrowRight
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );

          return (
            <li key={c.id}>
              {href ? (
                <Link
                  to={href}
                  className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>

      {remaining > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("entityDetail.moreCases", { count: remaining })}
        </p>
      ) : null}
    </section>
  );
}
