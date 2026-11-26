import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Seo } from "@/components/Seo";
import { Mail, Rss } from "@/components/icons";
import { NewCaseRow } from "@/components/new-cases/new-case-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LightHero } from "@/components/ui/light-hero";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cutoffFor,
  feedUrls,
  formatCount,
  formatWeekAD,
  formatWeekBS,
  groupCasesByWeek,
  nepalToday,
  WEEKS_PER_STEP,
  type WeekGroup,
} from "@/lib/new-cases";
import { cn } from "@/lib/utils";
import { newCasesQuery } from "@/queries/new-cases";
import type { Case } from "@/types/jds";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

/** Rows a week shows before "show all N". */
const ROWS_BEFORE_COLLAPSE = 10;

const pillLink =
  "inline-flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-[15px] text-primary transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:h-4 [&_svg]:w-4";

/**
 * /new-cases: every case published in the last few weeks, grouped by the
 * Friday → Thursday week of the weekly digest, newest first, with the RSS and
 * Atom feeds and the newsletter for anyone who wants them delivered.
 */
const NewCases = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ne" ? "ne" : "en";
  const [weeks, setWeeks] = useState(WEEKS_PER_STEP);

  // Pre-rendered at build time, but the list itself is fetched in the browser,
  // so "today" is the reader's today, not the build's.
  const today = nepalToday();
  const cutoff = cutoffFor(today, weeks);
  const { data, isLoading, isError, isFetching } = useQuery({
    ...newCasesQuery(cutoff),
    placeholderData: (previous) => previous,
  });

  const groups = data ? groupCasesByWeek(data.cases, today, weeks) : [];
  const feeds = feedUrls(lang);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${t("newCases.meta.title")} | ${SITE_NAME}`}
        description={t("newCases.meta.description")}
        canonicalUrl={`${SITE_URL}/new-cases/`}
        language={i18n.language}
      >
        <link rel="alternate" type="application/rss+xml" title={t("newCases.feeds.rssTitle")} href={feeds.rss} />
        <link rel="alternate" type="application/atom+xml" title={t("newCases.feeds.atomTitle")} href={feeds.atom} />
      </Seo>

      <main id="main-content" className="flex-1">
        <LightHero
          id="new-cases-title"
          eyebrow={t("newCases.eyebrow")}
          title={t("newCases.title")}
          description={t("newCases.description")}
          tight
        >
          <div className="mt-8">
            <p id="new-cases-subscribe" className="text-sm text-muted-foreground">
              {t("newCases.subscribe.label")}
            </p>
            <ul aria-labelledby="new-cases-subscribe" className="mt-3 flex flex-wrap items-center gap-2">
              <li>
                <a href="#footer-newsletter-title" className={pillLink}>
                  <Mail aria-hidden="true" />
                  {t("newCases.subscribe.email")}
                </a>
              </li>
              <li>
                <a href={feeds.rss} className={pillLink} type="application/rss+xml">
                  <Rss aria-hidden="true" />
                  {t("newCases.subscribe.rss")}
                </a>
              </li>
              <li>
                <a href={feeds.atom} className={pillLink} type="application/atom+xml">
                  <Rss aria-hidden="true" />
                  {t("newCases.subscribe.atom")}
                </a>
              </li>
            </ul>
          </div>
        </LightHero>

        <section aria-labelledby="new-cases-title" className="pb-20 md:pb-28">
          <div className="layout-container">
            <div className="max-w-4xl">
              {isError && !data ? (
                <EmptyState kind="couldNotLoad" title={t("newCases.errorTitle")} description={t("newCases.error")} />
              ) : isLoading || !data ? (
                <NewCasesSkeleton />
              ) : (
                <>
                  <div className="space-y-12">
                    {groups.map((group, index) => (
                      <WeekSection key={group.start} group={group} index={index} lang={lang} />
                    ))}
                  </div>
                  {data.hasOlder ? (
                    <div className="mt-12 flex justify-center print:hidden">
                      <Button
                        variant="quiet"
                        onClick={() => setWeeks((current) => current + WEEKS_PER_STEP)}
                        disabled={isFetching}
                        aria-busy={isFetching}
                      >
                        {isFetching ? t("newCases.loadingOlder") : t("newCases.showOlder")}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

function WeekSection({ group, index, lang }: Readonly<{ group: WeekGroup<Case>; index: number; lang: "ne" | "en" }>) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const headingId = `week-${group.start}`;
  const bs = formatWeekBS(group);
  const ad = formatWeekAD(group);
  const count = group.cases.length;
  const hidden = Math.max(0, count - ROWS_BEFORE_COLLAPSE);
  const relative = index === 0 ? t("newCases.week.thisWeek") : index === 1 ? t("newCases.week.lastWeek") : null;

  return (
    <section aria-labelledby={headingId}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
        <div className="min-w-0">
          {relative ? <p className="text-sm text-muted-foreground">{relative}</p> : null}
          <h2 id={headingId} className="font-case-section-title text-2xl text-primary">
            {lang === "ne" ? bs : ad}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{lang === "ne" ? ad : bs}</p>
        </div>
        <p className="rounded-full bg-muted px-3 py-1 text-sm text-primary">
          {t("newCases.week.count", { count, formatted: formatCount(count, lang) })}
        </p>
      </header>

      {count === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">{t("newCases.week.none")}</p>
      ) : (
        <>
          <ol>
            {group.cases.map((item, row) => (
              <NewCaseRow
                key={item.id}
                item={item}
                // Collapsed rows stay mounted so a printout still lists the week.
                className={cn(!expanded && row >= ROWS_BEFORE_COLLAPSE && "hidden print:grid")}
              />
            ))}
          </ol>
          {hidden > 0 && !expanded ? (
            <div className="pt-2 print:hidden">
              <Button variant="quiet" size="sm" onClick={() => setExpanded(true)}>
                {t("newCases.week.showAll", { count, formatted: formatCount(count, lang) })}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function NewCasesSkeleton() {
  const { t } = useTranslation();
  return (
    <output aria-label={t("newCases.loading")} className="block space-y-10">
      {Array.from({ length: 2 }, (_, week) => (
        <div key={week} aria-hidden="true" data-skeleton="">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-36" />
          <div className="mt-4 space-y-5">
            {Array.from({ length: 4 }, (_, row) => (
              <div
                key={row}
                className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[5.5rem_minmax(0,1fr)]"
              >
                <Skeleton className="h-4 w-14" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-40 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </output>
  );
}

export default NewCases;
