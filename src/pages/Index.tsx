import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/CaseCard";
import { FeaturedCaseSpotlight } from "@/components/home/featured-case-spotlight";
import { Hero } from "@/components/home/hero";
import { Reveal } from "@/components/ui/reveal";
import { SeptemberEvent } from "@/components/home/september-event";
import { Faq } from "@/components/home/faq";
import { ReportCaseCta } from "@/components/home/report-case-cta";
import { ShareOurVision } from "@/components/home/share-our-vision";
import { SupportingPartner } from "@/components/home/supportingpartner";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { useQuery } from "@tanstack/react-query";
import { getStatistics } from "@/services/jds-api";
import { featuredCasesQuery, FEATURED_CASE_COUNT } from "@/queries/home";
import { formatBigo } from "@/utils/number";
import { useMemo } from "react";

import type { ArchiveSearchResult, BilingualText, CaseSearchCardEntity } from "@/types/search";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { getSubjectEntities } from "@/utils/case-entities";
import { useTranslation } from "react-i18next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_NAME_NEPALI, SITE_URL } from "@/utils/seo";

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

  // Shared loading/error/missing guard for the hero stats. With no formatter a
  // resolved value renders as a plain grouped count; pass one (e.g. formatBigo
  // for the currency tile) to render it differently. A missing value (an absent
  // optional field on an older/pre-deploy payload) renders the "—" placeholder
  // rather than "0" / "Rs 0", so an absent stat never reads as a real zero.
  const getStatValue = (
    value: number | undefined,
    format: (v: number) => string = (v) => v.toLocaleString(),
  ): string => {
    if (statsError || statsLoading || value == null) return "—";
    return format(value);
  };

  // Query key + params live in queries/home.ts, shared verbatim with the SSR
  // prefetch in entry-server.tsx — the two must agree or the prefetch is wasted.
  // Still the search source (not /api/cases/), which is where the editorial
  // `weight` ordering lives.
  const { data: casesData } = useQuery({
    ...featuredCasesQuery(),
    staleTime: 5 * 60 * 1000,
  });

  const featuredCases = useMemo(() => {
    if (!casesData?.results) return [];
    return casesData.results
      .slice(0, FEATURED_CASE_COUNT)
      .map((result) => recentCaseToCard(result, currentLang));
  }, [casesData, currentLang]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`${SITE_NAME} — Nepal's Corruption Case Archive`}
        description={SITE_DESCRIPTION}
        canonicalUrl={`${SITE_URL}/`}
      >
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": SITE_NAME,
          // schema.org's slot for the same organisation under another name, and
          // the one identity field with room for the Nepali. Appending it to
          // SITE_NAME instead would double the length of every <title>.
          "alternateName": [SITE_NAME_NEPALI, "Jawafdehi"],
          "url": "https://jawafdehi.org",
          "description": SITE_DESCRIPTION,
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
      </Seo>

      <div className="flex-1">
        <Hero
          casesDocumented={getStatValue(stats?.published_cases)}
          totalBigo={getStatValue(stats?.total_bigo, formatBigo)}
          materials={getStatValue(stats?.materials?.total)}
          courtCasesTracked={getStatValue(stats?.ngm?.court_cases_total)}
        />

        {/* ── 2 September public event ── */}
        <SeptemberEvent />

        {/* ── What we're building ── */}
        {/* <section id="archive-intro" className="py-12 bg-muted/30 border-b border-border">
          <div className="layout-container">
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

        {/* ── Featured Cases ── */}
        {/* The `recent-cases` id is kept on purpose: nothing in src links to it,
            but external links to jawafdehi.org/#recent-cases would break. */}
        <section id="recent-cases" className="py-12 md:py-16 bg-muted/20">
          <div className="layout-container">
            <Reveal className="group">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {t("home.featuredCases.heading", "Featured Cases")}
                  </h2>
                  {/* Crimson rule that draws itself in as the section arrives.
                      Hidden state is the exception: idle (SSR / no-JS /
                      reduced motion) renders it fully drawn. */}
                  <span
                    aria-hidden="true"
                    className="mt-2 block h-1 w-14 origin-left rounded-full bg-accent transition-transform delay-200 duration-700 ease-out group-data-[reveal=hidden]:scale-x-0"
                  />
                  <p className="text-muted-foreground mt-2">
                    {t(
                      "home.featuredCases.subtitle",
                      "Recent high-impact corruption cases under public scrutiny",
                    )}
                  </p>
                </div>
              </div>
            </Reveal>

            {featuredCases.length > 0 ? (
              <>
                {/* The lead case gets the navy spotlight treatment; the rest
                    stay on the standard card. Order comes from the editorial
                    `weight` ranking in the search source. */}
                <Reveal>
                  <FeaturedCaseSpotlight {...featuredCases[0]} />
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 mb-8">
                  {featuredCases.slice(1).map((caseItem, index) => (
                    <Reveal key={caseItem.id} className="h-full" delayMs={(index % 3) * 90}>
                      <CaseCard {...caseItem} />
                    </Reveal>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="h-72 rounded-3xl bg-muted animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 mb-8">
                  {Array.from({ length: FEATURED_CASE_COUNT - 1 }, (_, i) => (
                    <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              </>
            )}

            <Reveal>
              <div className="text-center mt-10 mb-4 flex justify-center">
                <Button variant="primary" size="xl" asChild className="group">
                  <Link to="/search?type=case">
                    {t("home.featuredCases.viewAll", "View all cases")}{" "}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </Reveal>
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
