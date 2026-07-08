import { type FormEvent, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getStatistics } from "@/services/jds-api";
import { MissionRibbon } from "@/components/data-quality/MissionRibbon";
import { AccountabilityGap } from "@/components/data-quality/AccountabilityGap";
import { EntityBreakdown } from "@/components/data-quality/EntityBreakdown";
import { EvidenceBackbone } from "@/components/data-quality/EvidenceBackbone";
import { MaterialsBySource } from "@/components/data-quality/MaterialsBySource";
import { DataHonesty } from "@/components/data-quality/DataHonesty";
import { DataLimitations } from "@/components/data-quality/DataLimitations";
import { UseThisData } from "@/components/data-quality/UseThisData";
import { MethodologyFooter } from "@/components/data-quality/MethodologyFooter";
import { SearchBar } from "@/components/ui/search-bar";

const DataQuality = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
    // Share the cache with the home hero — same query key + fn.
    queryKey: ["statistics"],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000,
  });

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

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

            <form className="mt-6 w-full max-w-2xl" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="data-quality-search">
                {t("dataQuality.searchLabel", "Search the Jawafdehi archive")}
              </label>
              <SearchBar
                id="data-quality-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(
                  "dataQuality.searchPlaceholder",
                  "Search cases, people, offices, court records, or materials",
                )}
                submitLabel={t("dataQuality.searchSubmit", "Search")}
              />
            </form>
          </div>
        </section>

        <div className="container mx-auto space-y-12 px-6 py-12">
          {/* Quiet trust strip + last-refreshed signal. */}
          <MissionRibbon lastUpdated={data?.last_updated} />

          {/* Centerpiece: the accountability gap (funnel + ratio + status mix). */}
          <AccountabilityGap stats={data} isLoading={isLoading} isError={isError} />

          {isError && !data && (
            <p className="text-muted-foreground">
              {t("dataQuality.error", "Metrics are temporarily unavailable. Please try again later.")}
            </p>
          )}

          {/* Who we track: 88% people, then the institutions (live nes.by_type). */}
          <EntityBreakdown nes={data?.nes} />

          {/* The scale that backs every case. */}
          <EvidenceBackbone nes={data?.nes} ngm={data?.ngm} materials={data?.materials} />

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
