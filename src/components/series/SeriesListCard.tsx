import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Calendar, Coins } from "@/components/icons";
import { getCaseBadgeClassName } from "@/lib/case-badges";
import { CASE_PLACEHOLDER_DARK_CLASS } from "@/lib/case-images";
import {
  caseStatusLabelKey,
  displayBsDate,
  formatSeriesMoney,
  localDigits,
  pickSeriesText,
  seriesHeadlineBigo,
  seriesPath,
  statusCountEntries,
} from "@/lib/case-series";
import { useCaseImage } from "@/lib/use-case-image";
import { cn } from "@/lib/utils";
import type { SeriesListingCard } from "@/types/series";

/**
 * One case series in a case grid (the homepage and /cases), standing in for
 * all of its member cases: the API's collapsed listing sends one item per
 * series in their place. Same shell and image slot as <CaseCard>, so it sits in
 * the grid as one cell, with the series card's navy border (#545's search
 * card) so it reads as a group of cases rather than one more case.
 */
export function SeriesListCard({ card }: Readonly<{ card: SeriesListingCard }>) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.language;
  const href = seriesPath(card.slug);
  const title = pickSeriesText(card.title, language) || card.slug;
  const summary = pickSeriesText(card.summary, language);
  const statuses = statusCountEntries(card.totals?.status_counts);
  const bigo = seriesHeadlineBigo(card.totals);
  const latest = displayBsDate(null, card.latest_date, language);
  const filtered = card.matched_member_count > 0 && card.matched_member_count < card.member_count;
  const {
    src: imageSrc,
    srcSet,
    isPlaceholder,
    onError: handleImageError,
  } = useCaseImage(card.thumbnail, [card.thumbnail_url ?? undefined]);

  return (
    <Card
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-primary bg-surface transition-colors duration-200 hover:border-primary/80"
      data-testid="series-list-card"
      // A click on the card body opens the series. Clicks on its links are left
      // to the links and still bubble, so the search page's result-click
      // tracking (TrackedSearchResult) sees them.
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("a")) navigate(href);
      }}
    >
      <article className="flex h-full w-full flex-col">
        <div className="relative aspect-video shrink-0 overflow-hidden">
          <img
            alt={isPlaceholder ? "" : t("series.listCard.thumbnailAlt", { title })}
            className={cn(
              "h-full w-full object-cover",
              !isPlaceholder && "transition-transform duration-500 group-hover:scale-105",
              isPlaceholder && CASE_PLACEHOLDER_DARK_CLASS,
            )}
            decoding="async"
            loading="lazy"
            onError={handleImageError}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            src={imageSrc}
            srcSet={srcSet}
          />
          {!isPlaceholder && (
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-foreground/5 to-white/10" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          <CardHeader className="space-y-2 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[12.5px] font-medium text-primary-foreground">
                {t("series.kicker")}
              </span>
              {/* The member count is what makes this one card "several cases". */}
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[12.5px] font-medium text-primary">
                {t("series.caseCount", { n: localDigits(card.member_count, language) })}
              </span>
              {filtered ? (
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[12.5px] text-muted-foreground">
                  {t("series.listCard.matched", { n: localDigits(card.matched_member_count, language) })}
                </span>
              ) : null}
            </div>
            <h3 className="line-clamp-2 text-[17px] font-semibold leading-6 text-primary">
              <Link
                className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                to={href}
              >
                {title}
              </Link>
            </h3>
            {summary ? (
              <p className="line-clamp-2 text-[14px] leading-6 text-muted-foreground">{summary}</p>
            ) : null}
          </CardHeader>

          <CardContent className="flex flex-1 flex-col px-4 pb-0 pt-3 sm:px-5">
            <div className="space-y-1.5 text-sm leading-6 text-muted-foreground">
              {statuses.length > 0 ? (
                <ul aria-label={t("series.stats.status")} className="flex flex-wrap gap-1.5">
                  {statuses.map(([status, n]) => (
                    <li className={getCaseBadgeClassName("status", status, "shadow-none")} key={status}>
                      {localDigits(n, language)} {t(caseStatusLabelKey(status))}
                    </li>
                  ))}
                </ul>
              ) : null}
              {bigo ? (
                <div className="flex min-w-0 items-center">
                  <Coins aria-hidden="true" className="mr-2 h-[18px] w-[18px] flex-shrink-0" />
                  <span className="min-w-0 truncate">
                    {t(bigo.kind === "total" ? "series.listCard.totalBigo" : "series.listCard.largestBigo")}:
                  </span>
                  <span className="ml-1 shrink-0 font-medium text-accent">
                    {formatSeriesMoney(bigo.amount, language)}
                  </span>
                </div>
              ) : null}
              {latest ? (
                <div className="flex min-w-0 items-center">
                  <Calendar aria-hidden="true" className="mr-2 h-[18px] w-[18px] flex-shrink-0" />
                  <span className="min-w-0 truncate">{t("series.listCard.latest")}:</span>
                  <span className="ml-1 shrink-0">{latest}</span>
                </div>
              ) : null}
            </div>
          </CardContent>

          <CardFooter className="mt-auto px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <Button asChild className="w-full" variant="primary">
              <Link to={href}>
                {t("series.listCard.view")}
              </Link>
            </Button>
          </CardFooter>
        </div>
      </article>
    </Card>
  );
}
