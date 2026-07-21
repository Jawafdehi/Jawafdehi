import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

import { getCasesCitingEntity } from "@/services/jds-api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/date";
import { getCaseTypeLabelKey } from "@/utils/case-entities";
import {
  outcomeBadgeClass,
  outcomeLabel,
  shouldShowOutcome,
} from "@/utils/case-outcome";
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

// accused + alleged form the emphasized top tier (matches the server ordering).
function isAccusedTier(role: string): boolean {
  return role === "accused" || role === "alleged";
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

  // Defensive re-sort (the server already orders this way): accused/alleged
  // first, reverse-chron within each tier.
  const cases = [...data.results].sort((a, b) => {
    const ra = isAccusedTier(roleFor(a, entityIri).role) ? 0 : 1;
    const rb = isAccusedTier(roleFor(b, entityIri).role) ? 0 : 1;
    if (ra !== rb) return ra - rb;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
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
          const date = formatDate(c.case_start_date || c.created_at);
          const typeKey = getCaseTypeLabelKey(c.case_type);
          const typeLabel = typeKey ? t(typeKey) : c.case_type;
          const href = c.slug ? `/case/${c.slug}` : undefined;

          const row = (
            <div
              className={cn(
                "group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40",
                accused && "border-l-4 border-l-accent",
              )}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
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
                      {outcomeLabel(outcome, language)}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="line-clamp-2 text-base font-medium leading-snug text-primary group-hover:underline">
                  {c.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {typeLabel}
                  {date ? ` · ${date}` : ""}
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
