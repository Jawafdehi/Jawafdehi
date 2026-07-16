import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { getStatistics } from "@/services/jds-api";
import { formatFreshness } from "@/lib/data-quality";
import { AccountabilityGap } from "@/components/data-quality/AccountabilityGap";
import { EntityBreakdown } from "@/components/data-quality/EntityBreakdown";
import { EvidenceBackbone } from "@/components/data-quality/EvidenceBackbone";
import { MaterialsBySource } from "@/components/data-quality/MaterialsBySource";
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
        <section className="border-b bg-muted/20">
          <div className="container mx-auto px-6 py-12 md:py-16">
            <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              {t("dataQuality.title", "Data Quality & Coverage")}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {t(
                "dataQuality.intro",
                "What our public datasets track today, and how complete the records are.",
              )}
            </p>
            {freshness && (
              <p className="mt-4 flex items-center gap-1.5 text-sm italic text-muted-foreground/80">
                <RefreshCw className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                {t("dataQuality.ribbon.refreshed", "Data last refreshed {{ago}}", {
                  ago: freshness,
                })}
              </p>
            )}
          </div>
        </section>

        <div className="container mx-auto space-y-12 px-6 py-12">
          {/* Centerpiece: corruption cases (funnel + status + CIAA split). */}
          <AccountabilityGap stats={data} isLoading={isLoading} isError={isError} />

          {isError && !data && (
            <p className="text-muted-foreground">
              {t("dataQuality.error", "Metrics are temporarily unavailable. Please try again later.")}
            </p>
          )}

          {/* Who we track: 88% people, then the institutions (live nes.by_type). */}
          <EntityBreakdown nes={data?.nes} />

          {/* Court cases: the judicial record base + court x year heatmap. */}
          <EvidenceBackbone ngm={data?.ngm} />

          {/* Where the evidence comes from (live materials.by_source). */}
          <MaterialsBySource materials={data?.materials} />

          {/* Honest completeness / trust label. */}
          <DataHonesty nes={data?.nes} ngm={data?.ngm} materials={data?.materials} />

          {/* Where this comes from: conceptual public-record → published-case flow. */}
          <DataPipeline />

          {/* Make the data reusable: the public API + report-an-error. */}
          <UseThisData />
        </div>
      </main>
    </div>
  );
};

export default DataQuality;
