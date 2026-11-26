import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getCaseBadgeClassName } from "@/lib/case-badges";
import {
  caseStatusLabelKey,
  formatSeriesMoney,
  localDigits,
  pickSeriesText,
  seriesCardOf,
  seriesPath,
  seriesSlugFromUrl,
  statusCountEntries,
} from "@/lib/case-series";
import { cn } from "@/lib/utils";
import type { ArchiveSearchResult } from "@/types/search";

const stripTags = (value: string) => value.replace(/<[^>]*>/g, "");

/**
 * A series hit on /search: a bordered card that stands for all its member
 * cases — kicker, title, summary, status / largest बिगो / accused, and one
 * chip per member listing its court-case numbers. Falls back to the hit's own
 * title and snippet when the index document carries no card yet.
 */
export function SeriesResultCard({ result }: Readonly<{ result: ArchiveSearchResult }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const card = seriesCardOf(result);
  const slug = card?.slug ?? seriesSlugFromUrl(result.url);
  const title =
    (card ? pickSeriesText(card.title, language) : "") ||
    stripTags(pickSeriesText(result.title, language)) ||
    slug ||
    result.id;
  const summary =
    (card ? pickSeriesText(card.summary, language) : "") || stripTags(pickSeriesText(result.snippet, language));
  const totals = card?.totals;
  const status = statusCountEntries(totals?.status_counts)
    .map(([key, n]) => `${localDigits(n, language)} ${t(caseStatusLabelKey(key))}`)
    .join(", ");
  const topStatus = statusCountEntries(totals?.status_counts)[0]?.[0];
  const members = [...(card?.members ?? [])].sort((a, b) => a.ordinal - b.ordinal);
  const href = slug ? seriesPath(slug) : result.url;

  return (
    <article className="rounded-2xl border-2 border-primary bg-gradient-to-b from-muted/60 to-surface p-5 transition-colors hover:border-primary/80">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-primary px-3 py-0.5 text-[13px] text-primary-foreground">
          {t("series.kicker")}
        </span>
        {totals ? (
          <span className="rounded-full bg-muted px-3 py-0.5 text-[13px] text-primary">
            {t("series.search.counts", {
              members: localDigits(totals.member_count, language),
              courtCases: localDigits(totals.court_case_count, language),
            })}
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 text-[19px] font-semibold leading-snug text-primary">
        <Link
          className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          to={href}
        >
          {title}
        </Link>
      </h3>
      {summary ? <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{summary}</p> : null}
      {totals ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          {status ? (
            <span className={getCaseBadgeClassName("status", topStatus, "shadow-none")}>{status}</span>
          ) : null}
          {totals.bigo_max ? (
            <span>
              {t("series.search.largestBigo", { amount: formatSeriesMoney(totals.bigo_max.amount, language) })}
            </span>
          ) : null}
          {totals.accused_count ? (
            <span>{t("series.search.accused", { n: localDigits(totals.accused_count, language) })}</span>
          ) : null}
        </div>
      ) : null}
      {members.length > 0 ? (
        <ul aria-label={t("series.search.memberCourtCases")} className="mt-3 flex flex-wrap gap-1.5">
          {members.map((member) => (
            <li
              className={cn("rounded-lg border border-border bg-surface px-2 py-0.5 text-[12.5px] text-primary")}
              key={member.slug}
            >
              {localDigits(member.ordinal, language)}.{" "}
              {member.court_case_numbers.length ? member.court_case_numbers.join(", ") : member.slug}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
