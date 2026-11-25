import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "@/components/icons";

import { entityRelatedCasesQuery } from "@/queries/related-cases";
import { Badge } from "@/components/ui/badge";
import { CaseTagBadge } from "@/components/CaseBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/date";
import { formatBigo } from "@/utils/number";
import { getCaseTypeLabelKey } from "@/utils/case-entities";
import { outcomeBadgeClass } from "@/utils/case-outcome";
import { appealBadgeClass } from "@/utils/appeal-verdict";
import { caseInvolvement, orderCasesForEntity } from "@/utils/entity-involvement";
import type { Case } from "@/types/jds";
import { casePath } from "@/lib/case-links";

// One page holds the lot: the corpus is small (the busiest entity has ~20
// cases) and the list scrolls inside its column, so nothing is left behind a
// "+N more" line short of an entity with over fifty citations.
//
// Role, verdict and appeal for each card come from caseInvolvement() — shared
// with the page's search snippet, so the two can never say different things.

/**
 * "Related cases" section for an entity record page: the published cases that
 * cite this entity, accused/alleged floated to the top and visually emphasized,
 * everything else reverse-chronologically below. Renders nothing when the entity
 * has no published citations (or on error), so it can be dropped in unconditionally.
 */
export function EntityRelatedCases({
  entityIri,
  className,
}: Readonly<{ entityIri: string; className?: string }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language === "ne" ? "ne" : "en";

  const { data, isLoading, isError } = useQuery({
    ...entityRelatedCasesQuery(entityIri),
    enabled: entityIri.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section aria-busy="true" className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-[20px]" />
        <Skeleton className="h-24 w-full rounded-[20px]" />
      </section>
    );
  }

  // Nothing to say on error; an empty result keeps the heading and says so.
  if (isError || !data) return null;

  // accused/alleged first, then newest first — see orderCasesForEntity.
  const cases = orderCasesForEntity(data.results, entityIri);

  const remaining = data.count - cases.length;

  return (
    // A flex column so a height-constrained parent makes the LIST scroll while
    // the heading and the "more" line stay put.
    <section aria-labelledby="related-cases-heading" className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <h2 id="related-cases-heading" className="font-home-display text-2xl text-primary md:text-[1.75rem]">
          {t("entityDetail.relatedCases")}
        </h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {data.count} {t(data.count === 1 ? "entityDetail.caseOne" : "entityDetail.cases").toLowerCase()}
        </span>
      </div>

      {data.count === 0 ? (
        <>
          {/* An entity no published case cites is hidden from public entity
              search (see `entities/search_visibility.py` in the API), and its
              page carries nothing but registry fields — so keep the ~186k of
              them out of the index too rather than publishing thin pages with
              no case context. The sitemap is the positive half of this: it
              lists exactly the cited entities.

              Placed here, in the component that HAS the answer, rather than in
              the page: the page would have to duplicate this query to know.
              Emitted only on a loaded, genuinely empty result — the error path
              above returns early, so a failed request never deindexes a page.

              `follow` is deliberate: the case links on a cited entity's page
              are worth crawling, and this branch renders none, but keeping the
              directive consistent avoids implying the outbound links are
              untrusted. */}
          <Helmet>
            <meta name="robots" content="noindex, follow" />
          </Helmet>
          <p className="mt-5 rounded-[20px] border border-dashed border-border px-5 py-6 text-[15px] leading-7 text-muted-foreground">
            {t("entityDetail.noRelatedCases")}
          </p>
        </>
      ) : null}

      <ul className="mt-5 min-h-0 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {cases.map((c) => {
          const { outcome, accused, roleLabel, showOutcome, outcomeText, appeal, appealText } =
            caseInvolvement(c, entityIri, language, t);
          const date = formatDate(c.proceedings_started_on || c.created_at);
          const offenceType = c.offence_type || c.case_type;
          const typeKey = getCaseTypeLabelKey(offenceType);
          const typeLabel = typeKey ? t(typeKey) : offenceType;
          const href = c.slug ? casePath(c.slug) : undefined;

          const row = (
            <div
              className={cn(
                // Hairline cards; an accused role is marked by its crimson
                // pill, not by a heavy left bar.
                "group flex items-start gap-3 rounded-[20px] border border-border/70 bg-surface p-5 transition-[border-color,background-color] duration-200 ease-out hover:border-primary/25",
              )}
            >
              {/* Title leads: it is what a reader scans for. The role/verdict
                  badges and the type · date · amount meta sit under it. */}
              <div className="min-w-0 flex-1 space-y-3">
                <h3 className="line-clamp-2 text-[17px] leading-snug text-primary">
                  {c.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  {/* The updates page's pill: grey for a role, crimson only
                      when the role is accused. */}
                  <CaseTagBadge
                    className={cn("shrink-0 px-3 py-1 text-sm", accused && "bg-accent/10 text-accent hover:bg-accent/10")}
                  >
                    {roleLabel}
                  </CaseTagBadge>
                  {showOutcome ? (
                    <Badge variant="outline" className={outcomeBadgeClass(outcome)}>
                      {outcomeText}
                    </Badge>
                  ) : null}
                  {appeal ? (
                    <Badge
                      variant="outline"
                      className={appealBadgeClass(appeal.result, outcome)}
                      data-testid="related-case-appeal"
                    >
                      {appealText}
                    </Badge>
                  ) : null}
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {[typeLabel, date].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {/* `formatBigo(0)` is the literal "Rs 0", so only render a real
                    amount — a missing bigo is not a zero-rupee case. */}
                {c.bigo ? (
                  <p className="text-sm text-muted-foreground">
                    <span>{t("caseCard.bigo")}: </span>
                    <span className="font-medium tabular-nums text-accent">
                      {formatBigo(c.bigo, i18n.language)}
                    </span>
                  </p>
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
        <p className="mt-4 shrink-0 text-sm text-muted-foreground">
          {t("entityDetail.moreCases", { count: remaining })}
        </p>
      ) : null}
    </section>
  );
}
