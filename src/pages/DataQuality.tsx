import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { LightHero } from "@/components/ui/light-hero";

import { getStatistics } from "@/services/jds-api";
import { formatFreshness } from "@/lib/data-quality";
import { AccountabilityGap } from "@/components/data-quality/AccountabilityGap";
import { EntityBreakdown } from "@/components/data-quality/EntityBreakdown";
import { EvidenceBackbone } from "@/components/data-quality/EvidenceBackbone";
import { SourcesSummary } from "@/components/data-quality/SourcesSummary";
import { DataHonesty } from "@/components/data-quality/DataHonesty";
import { DataPipeline } from "@/components/data-quality/DataPipeline";
import { UseThisData } from "@/components/data-quality/UseThisData";

const DataQuality = () => {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    // Share the cache with the home hero — same query key + fn.
    queryKey: ["statistics"],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000,
  });

  const freshness = data ? formatFreshness(data.last_updated, t) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{t("dataQuality.title", "Data Quality & Coverage")} · Jawafdehi</title>
        <meta
          name="description"
          content={t(
            "dataQuality.intro",
            "What our public datasets track today, and how complete the records are.",
          )}
        />
        <link rel="canonical" href="https://jawafdehi.org/data-quality" />
      </Helmet>

      <main id="main-content" className="flex-1">
        <LightHero
          id="data-quality-title"
          shader={false}
          eyebrow={t("dataQuality.eyebrow", "Open data")}
          title={t("dataQuality.title", "Data Quality & Coverage")}
          description={t(
            "dataQuality.intro",
            "What our public datasets track today, and how complete the records are.",
          )}
        >
          {freshness && (
            <p className="mt-5 flex items-center gap-2 text-[15px] text-muted-foreground">
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("dataQuality.ribbon.refreshed", "Data last refreshed {{ago}}", {
                ago: freshness,
              })}
            </p>
          )}
        </LightHero>

        {/* Main's order (JAW-46): evidence sources, court cases, then the
            corruption-case funnel, entities last. Sections are spaced, not
            ruled, as elsewhere in the redesign. */}
        <div className="layout-container space-y-16 pb-20 md:space-y-24">
          {isError && !data && (
            <EmptyState
              kind="couldNotLoad"
              title={t("dataQuality.errorTitle", "The figures didn't load")}
              description={t("dataQuality.error", "Metrics are temporarily unavailable. Please try again later.")}
            />
          )}

          {/* Where the evidence comes from: a summary of the one source list on
              /materials#sources, from the same /api/document-sources/ catalogue. */}
          <SourcesSummary />

          {/* Court cases: the judicial record base + court x year heatmap. */}
          <EvidenceBackbone ngm={data?.ngm} />

          {/* Corruption cases (funnel + status + CIAA split). */}
          <AccountabilityGap stats={data} isLoading={isLoading} isError={isError} />

          {/* Honest completeness / trust label. */}
          <DataHonesty nes={data?.nes} ngm={data?.ngm} materials={data?.materials} />

          {/* Where this comes from: conceptual public-record → published-case flow. */}
          <DataPipeline />

          {/* Make the data reusable: the public API + report-an-error. */}
          <UseThisData />

          {/* Who we track: 88% people, then the institutions (live nes.by_type). */}
          <EntityBreakdown nes={data?.nes} />
        </div>
      </main>
    </div>
  );
};

export default DataQuality;
