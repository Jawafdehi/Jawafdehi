import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/CaseCard";
import { Hero } from "@/components/home/hero";
import { Faq } from "@/components/home/faq";
import { ReportCaseCta } from "@/components/home/report-case-cta";
import { ShareOurVision } from "@/components/home/share-our-vision";
import { SupportingPartner } from "@/components/home/supportingpartner";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getStatistics } from "@/services/jds-api";
import { searchArchive } from "@/services/search-api";
import { useMemo } from "react";

import type { ArchiveSearchResult, BilingualText, CaseSearchCardEntity } from "@/types/search";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { getSubjectEntities } from "@/utils/case-entities";
import { useTranslation } from "react-i18next";

const RECENT_CASE_COUNT = 6;

type CaseCardStatus = "ongoing" | "resolved" | "under-investigation";

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function pickText(text: BilingualText | undefined): string {
  return stripTags(text?.en || text?.ne || "");
}

function caseSlugFromUrl(url: string): string | null {
  const match = /\/case\/([^/?#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

function mapCaseStatus(status: string | null | undefined): CaseCardStatus {
  if (status === "ongoing") return "ongoing";
  if (status === "closed") return "resolved";
  return "under-investigation";
}

function entityNames(
  entities: readonly CaseSearchCardEntity[],
  fallback: string,
): string[] {
  return entities.map((entity) => entity.display_name || entity.nes_id || fallback);
}

function entityIds(entities: readonly CaseSearchCardEntity[]): string[] {
  return entities
    .map((entity) => entity.nes_id)
    .filter((id): id is string => Boolean(id));
}

function recentCaseToCard(result: ArchiveSearchResult, currentLang: string) {
  const card = result.card;
  const entities = card?.entities ?? [];
  const subjectEntities = getSubjectEntities<CaseSearchCardEntity>(
    entities,
    (entity) => entity.type,
  );
  const locationEntities = entities.filter((entity) => entity.type === "location");
  const unknownEntity = translateDynamicText("Unknown Entity", currentLang);
  const unknownLocation = translateDynamicText("Unknown Location", currentLang);
  const names = entityNames(subjectEntities, unknownEntity);
  const locations = entityNames(locationEntities, unknownLocation);

  return {
    id: result.id,
    slug: card?.slug || caseSlugFromUrl(result.url),
    title: card?.title || pickText(result.title) || result.id,
    entity: names[0] || unknownEntity,
    entityNames: names,
    location: locations.join(", ") || unknownLocation,
    status: mapCaseStatus(card?.status || result.extra.case_status),
    description: stripTags(card?.short_description || pickText(result.snippet)).substring(0, 200),
    allegations: card?.key_allegations || [],
    thumbnailUrl: card?.thumbnail_url || undefined,
    bannerUrl: card?.banner_url || undefined,
    tags: card?.tags || [],
    entityIds: entityIds(subjectEntities),
    locationIds: entityIds(locationEntities),
  };
}

const Index = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const { data: stats, isError: statsError, isLoading: statsLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const getStatValue = (value: number | undefined): string => {
    if (statsError || statsLoading) return "—";
    return value?.toLocaleString() || "0";
  };

  // Keep the query key in sync with the SSR prefetch in entry-server.tsx.
  // Use the same newest-by-case-date search source as the archive/cases pages,
  // not /api/cases/' creation-time ordering.
  const { data: casesData } = useQuery({
    queryKey: ["home-recent-cases", { page_size: RECENT_CASE_COUNT }],
    queryFn: () =>
      searchArchive({
        type: "case",
        sort: "newest",
        page_size: RECENT_CASE_COUNT,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const featuredCases = useMemo(() => {
    if (!casesData?.results) return [];
    return casesData.results
      .slice(0, RECENT_CASE_COUNT)
      .map((result) => recentCaseToCard(result, currentLang));
  }, [casesData, currentLang]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Jawafdehi — Nepal's Corruption Case Archive</title>
        <meta name="description" content="Every CIAA corruption case documented, simplified, and permanently accessible. Nepal's authoritative public record of corruption cases and official documents." />
        <link rel="canonical" href="https://jawafdehi.org/" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/" />
        <meta property="og:title" content="Jawafdehi — Nepal's Corruption Case Archive" />
        <meta property="og:description" content="Every CIAA corruption case documented, simplified, and permanently accessible. Nepal's authoritative public record of corruption cases and official documents." />
        <meta property="og:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jawafdehi — Nepal's Corruption Case Archive" />
        <meta name="twitter:description" content="Every CIAA corruption case documented, simplified, and permanently accessible. Nepal's authoritative public record of corruption cases and official documents." />
        <meta name="twitter:image" content="https://jawafdehi.org/assets/social-preview.png" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Jawafdehi",
          "alternateName": "Jawafdehi Nepal",
          "url": "https://jawafdehi.org",
          "description": "Nepal's permanent public archive of CIAA corruption cases — every filing, every document, forever.",
          "inLanguage": ["en", "ne"],
          "potentialAction": [
            {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://jawafdehi.org/search?type=case&q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            },
            {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://jawafdehi.org/search?type=entity&q={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          ]
        })}</script>
      </Helmet>

      <div className="flex-1">
        <Hero
          casesDocumented={getStatValue(stats?.published_cases)}
          officialsAndEntitiesTracked={getStatValue(stats?.nes?.total)}
          courtRecords={getStatValue(stats?.ngm?.court_cases_total)}
          materials={getStatValue(stats?.materials?.total)}
        />


        {/* ── What we're building ── */}
        {/* <section id="archive-intro" className="py-12 bg-muted/30 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-base md:text-lg text-foreground/80 leading-relaxed">
                Corruption records are scattered across dozens of government portals, court systems, and public databases — inaccessible to most citizens.{" "}
                <span className="font-semibold text-foreground">We are building the technology and the volunteer network to bring it all into one permanent, publicly searchable knowledge base.</span>{" "}
                Free to use. Open source. Built entirely by Nepali volunteers.
              </p>
            </div>
          </div>
        </section>  */}

        {/* <Features /> */}

        {/* ── Recently Documented Cases ── */}
        <section id="recent-cases" className="py-12 md:py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {t("home.recentCases.heading", "Recently Documented Cases")}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {t("home.recentCases.subtitle", "Latest cases added to the archive")}
                </p>
              </div>
            </div>

            {featuredCases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {featuredCases.map((caseItem) => (
                  <CaseCard key={caseItem.id} {...caseItem} hideDescription={true} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {Array.from({ length: RECENT_CASE_COUNT }, (_, i) => (
                  <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            )}

            <div className="text-center mt-10 mb-4 flex justify-center">
              <Button variant="primary" size="xl" asChild>
                <Link to="/search?type=case">
                  {t("home.recentCases.viewAll", "View all cases")}{" "}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <ReportCaseCta />
        <Faq />
        <ShareOurVision />
        <SupportingPartner />
      </div>
    </div>
  );
};

export default Index;
