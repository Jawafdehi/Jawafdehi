import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { FloatingShareSidebar } from "@/components/FloatingShareSidebar";
import { ReportCaseDialog } from "@/components/ReportCaseDialog";
import { Seo } from "@/components/Seo";
import { SeriesTimelineChart } from "@/components/series/SeriesTimelineChart";
import {
  SeriesAccusedList,
  SeriesKeyNumbers,
  SeriesMemberList,
  SeriesMergedTimeline,
  SeriesSourceList,
} from "@/components/series/series-sections";
import { CaseSectionHeading } from "@/components/case-detail/case-section-heading";
import { ArrowLeft, Share2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { localDigits, pickSeriesText, seriesPath } from "@/lib/case-series";
import { useSeries } from "@/queries/series";
import { SITE_URL } from "@/utils/seo";
import "@/styles/print.css";

/**
 * `/series/:slug/`: one affair's separate cases on one page — the members in
 * order, their court cases on one time axis, the accused across them, and the
 * merged timeline and sources. Client-rendered (see site-routes.ts).
 */
const SeriesDetailPage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: series, isLoading, isError } = useSeries(slug);
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (isLoading) {
    return (
      <div aria-busy="true" className="layout-container pb-20 pt-8 md:pt-10">
        <div className="mx-auto max-w-[880px]">
          <Skeleton className="h-4 w-48" />
          <div className="mt-6 flex gap-2">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-11 w-2/3 rounded-xl" />
          <Skeleton className="mt-4 h-20 w-full rounded-xl" />
          <div className="mt-8 grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton className="h-20 rounded-xl" key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !series) {
    return (
      <div className="layout-container flex-1">
        <EmptyState
          actions={
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-5 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              to="/search/?type=case"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {t("series.searchCases")}
            </Link>
          }
          description={isError ? t("series.failed.line") : t("series.notFound.line")}
          fullHeight
          headingLevel="h1"
          kind={isError ? "couldNotLoad" : "notFound"}
          title={isError ? t("series.failed.title") : t("series.notFound.title")}
        />
      </div>
    );
  }

  const title = pickSeriesText(series.title, language) || series.slug;
  const summary = pickSeriesText(series.summary, language);
  const canonicalUrl = `${SITE_URL}${seriesPath(series.slug)}`;
  const memberCount = series.totals.member_count || series.members.length;

  const handleShare = async () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setIsShareOpen(true);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title, text: summary, url: canonicalUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      toast.success(t("share.linkCopied"));
    } catch {
      toast.error(t("share.copyFailed"));
    }
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background">
      <Seo
        canonicalUrl={canonicalUrl}
        description={summary || title}
        language={language}
        modifiedTime={series.updated_at}
        title={`${title} — ${t("series.kicker")}`}
        type="article"
      />
      <FloatingShareSidebar
        description={summary}
        onOpenChange={setIsShareOpen}
        open={isShareOpen}
        title={title}
        url={canonicalUrl}
      />

      <div className="layout-container flex-1 pb-20 pt-8 md:pt-10 lg:pl-24 min-[1536px]:pl-8">
        <div className="mx-auto max-w-[880px]">
          <PageBreadcrumb
            items={[
              { label: t("nav.home"), to: "/" },
              { label: t("nav.cases"), to: "/search/?type=case" },
              { label: title },
            ]}
          />

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-[13px] text-primary-foreground">
              {t("series.kicker")}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-[13px] text-primary">
              {t("series.caseCount", { n: localDigits(memberCount, language) })}
            </span>
          </div>

          <h1 className="font-home-display mt-4 text-balance break-words text-[2rem] text-primary sm:text-[2.5rem]">
            {title}
          </h1>
          {summary ? <p className="mt-4 text-[17px] leading-8 text-muted-foreground">{summary}</p> : null}

          <div className="no-print mt-6 flex flex-wrap items-center gap-3 [&_button]:rounded-full">
            <ReportCaseDialog caseId={`series/${series.slug}`} caseTitle={title} />
            <Button
              className="gap-2 border-border bg-background text-primary hover:bg-muted hover:text-primary"
              onClick={handleShare}
              type="button"
              variant="outline"
            >
              <Share2 aria-hidden="true" className="h-4 w-4" />
              <span>{t("series.share")}</span>
            </Button>
          </div>

          <SeriesKeyNumbers series={series} />
          <SeriesMemberList members={series.members} />

          <section className="mt-12" id="court-cases">
            <CaseSectionHeading>{t("series.chart.heading")}</CaseSectionHeading>
            <SeriesTimelineChart courtCases={series.court_cases} members={series.members} />
          </section>

          <SeriesAccusedList series={series} />
          <SeriesMergedTimeline series={series} />
          <SeriesSourceList series={series} />
        </div>
      </div>
    </div>
  );
};

export default SeriesDetailPage;
