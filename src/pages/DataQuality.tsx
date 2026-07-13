import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getStatistics } from "@/services/jds-api";
import { MOCK_STATISTICS } from "@/lib/data-quality-mock";
import { AccountabilityGap } from "@/components/data-quality/AccountabilityGap";
import { EntityBreakdown } from "@/components/data-quality/EntityBreakdown";
import { EvidenceBackbone } from "@/components/data-quality/EvidenceBackbone";
import { MaterialsBySource } from "@/components/data-quality/MaterialsBySource";
import { DataHonesty } from "@/components/data-quality/DataHonesty";
import { DataLimitations } from "@/components/data-quality/DataLimitations";
import { UseThisData } from "@/components/data-quality/UseThisData";
import { MethodologyFooter } from "@/components/data-quality/MethodologyFooter";

const DataQuality = () => {
  const { t } = useTranslation();

  // `?mock=1` previews the page from a local fixture (data-quality-mock.ts)
  // instead of the live API. This is the review surface for the new sections:
  // their aggregates only land in the live payload after the backend deploys.
  const [searchParams] = useSearchParams();
  const useMock = searchParams.get("mock") === "1";

  const {
    data: liveData,
    isLoading: liveLoading,
    isError: liveError,
  } = useQuery({
    // Share the cache with the home hero — same query key + fn.
    queryKey: ["statistics"],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000,
    enabled: !useMock,
  });

  const data = useMock ? MOCK_STATISTICS : liveData;
  const isLoading = useMock ? false : liveLoading;
  const isError = useMock ? false : liveError;

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

          {/* The named limits of what's here (real facts). */}
          <DataLimitations stats={data} />

          {/* Make the data reusable: the public API. */}
          <UseThisData />

          {/* Plain-language methodology + report-an-error. */}
          <MethodologyFooter />
        </div>
      </main>
    </div>
  );
};

export default DataQuality;
