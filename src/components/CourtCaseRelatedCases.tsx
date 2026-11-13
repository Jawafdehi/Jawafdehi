import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "@/components/icons";

import { getCasesCitingCourtCase } from "@/services/jds-api";
import { CaseTypeBadge } from "@/components/CaseBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/utils/date";
import { getCaseTypeLabelKey } from "@/utils/case-entities";

// First page only — a court case is rarely cited by many Jawafdehi cases.
const PAGE_SIZE = 20;

/**
 * "Related Jawafdehi cases" section for a court case's own page: the published
 * cases that cite this court case. The reverse of the case -> court-case link
 * already rendered by `case-detail/court-cases-section.tsx`.
 *
 * Flat and reverse-chronological — unlike the entity page's equivalent there is
 * no accused/alleged tier to float, because a court-case reference carries no
 * relationship type. Renders nothing when no published case cites this court
 * case (or on error), so it can be dropped in unconditionally.
 */
export function CourtCaseRelatedCases({ courtCaseIri }: { courtCaseIri: string }) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["courtcase-related-cases", courtCaseIri],
    queryFn: () => getCasesCitingCourtCase(courtCaseIri, { page_size: PAGE_SIZE }),
    enabled: courtCaseIri.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section aria-busy="true" className="space-y-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-[4.5rem] w-full rounded-xl" />
      </section>
    );
  }

  // Hide the whole section when nothing published cites this court case.
  if (isError || !data || data.count === 0) return null;

  const remaining = data.count - data.results.length;

  return (
    <section aria-labelledby="courtcase-related-cases-heading" className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="courtcase-related-cases-heading"
          className="font-case-section-title"
        >
          {t("courtCaseDetail.relatedCases")}
        </h2>
        <span className="text-[15px] tabular-nums text-muted-foreground">{data.count}</span>
      </div>

      <ul className="space-y-3">
        {data.results.map((c) => {
          const date = formatDate(c.proceedings_started_on || c.created_at);
          const offenceType = c.offence_type || c.case_type;
          const typeKey = getCaseTypeLabelKey(offenceType);
          const typeLabel = typeKey ? t(typeKey) : offenceType;
          const href = c.slug ? `/case/${c.slug}` : undefined;

          const row = (
            <div className="group flex items-start gap-3 rounded-[20px] border border-border/70 bg-surface p-5 transition-[border-color] duration-200 ease-out hover:border-primary/25">
              <div className="min-w-0 flex-1 space-y-2.5">
                {typeLabel ? (
                  <CaseTypeBadge caseType={offenceType} className="shrink-0 px-3 py-1 text-sm">
                    {typeLabel}
                  </CaseTypeBadge>
                ) : null}
                <h3 className="line-clamp-2 text-[17px] leading-snug text-primary">
                  {c.title}
                </h3>
                {date ? (
                  <p className="text-sm tabular-nums text-muted-foreground">{date}</p>
                ) : null}
              </div>
              {href ? (
                <ArrowRight
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-hover:translate-x-0.5"
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
                  className="block rounded-[20px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {t("courtCaseDetail.moreCases", { count: remaining })}
        </p>
      ) : null}
    </section>
  );
}
