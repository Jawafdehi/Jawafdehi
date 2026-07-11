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
import { useQuery, useQueries } from "@tanstack/react-query";
import { getCases, getStatistics } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import { useMemo } from "react";

import type { Entity } from "@/types/entity";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { getSubjectEntities } from "@/utils/case-entities";
import { useTranslation } from "react-i18next";

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

  // The "Recently Documented Cases" section renders only the top 3 cards, so
  // fetch exactly 3 rather than the default page of 20 — this shrinks the
  // payload and the backend per-card resolution work. Keep the query key in
  // sync with the SSR prefetch in entry-server.tsx.
  const { data: casesData } = useQuery({
    queryKey: ['cases', { page: 1, page_size: 3 }],
    queryFn: () => getCases({ page: 1, page_size: 3 }),
    staleTime: 5 * 60 * 1000,
  });

  // Resolve location entity display names via react-query so they are cached
  // and deduped across mounts (and shared with the case-detail page's
  // ["entity-record", id] queries) instead of an uncached imperative fetch that
  // re-fires on every mount. Only the top 3 rendered cases' locations are read.
  const locationNesIds = useMemo(() => {
    const top = casesData?.results?.slice(0, 3) ?? [];
    const ids = top
      .flatMap(c => c.entities ?? [])
      .filter(e => e.type === 'location' && e.nes_id)
      .map(e => e.nes_id!);
    return [...new Set(ids)];
  }, [casesData]);

  const entityQueries = useQueries({
    queries: locationNesIds.map(nesId => ({
      queryKey: ["entity-record", nesId],
      queryFn: () => getEntityById(nesId),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  // Build the resolved-name map from the cached query results. useQueries applies
  // structural sharing, so entityQueries keeps a stable reference until a result
  // actually changes (including a background refetch) — depending on it directly
  // recomputes the map exactly when data changes and no more often.
  const resolvedEntities = useMemo(() => {
    const map: Record<string, Entity> = {};
    locationNesIds.forEach((nesId, i) => {
      const entity = entityQueries[i]?.data;
      if (entity) map[nesId] = entity;
    });
    return map;
  }, [locationNesIds, entityQueries]);

  // Transform API cases to CaseCard format
  const featuredCases = useMemo(() => {
    if (!casesData?.results) return [];
    return casesData.results.slice(0, 3).map((caseItem) => {
      // Locations and the case's subject entities. Subjects are the accused for
      // CORRUPTION cases, else any named (non-location) entity so cases without
      // an accused (e.g. TAX_EVASION) still name a subject.
      const locationEntities = caseItem.entities?.filter(e => e.type === 'location') || [];
      const namedEntities = getSubjectEntities(caseItem.entities, e => e.type);

      const entityNames = namedEntities.map(e => {
        if (e.nes_id && resolvedEntities[e.nes_id]) {
          const entity = resolvedEntities[e.nes_id];
          return entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id;
        }
        return e.display_name || e.nes_id || translateDynamicText('Unknown Entity', currentLang);
      });
      const primaryEntity = entityNames[0] || "Unknown Entity";

      // Translate location names using entity resolution
      const locationNames = locationEntities.map(e => {
        if (e.nes_id && resolvedEntities[e.nes_id]) {
          const entity = resolvedEntities[e.nes_id];
          const name = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id;
          return translateDynamicText(name, currentLang);
        }
        const name = e.display_name || e.nes_id || 'Unknown';
        return translateDynamicText(name, currentLang);
      }).join(', ') || translateDynamicText('Unknown Location', currentLang);

      return {
        id: caseItem.id.toString(),
        slug: caseItem.slug,
        title: caseItem.title,
        entity: primaryEntity,
        entityNames,
        location: locationNames,
        status: "ongoing" as const, // All published cases shown as ongoing
        description: (caseItem.short_description ?? '').replace(/<[^>]*>/g, '').substring(0, 200),
        allegations: caseItem.key_allegations, // Pass key allegations to CaseCard
        thumbnailUrl: caseItem.thumbnail_url ?? undefined,
        bannerUrl: caseItem.banner_url ?? undefined,
        tags: caseItem.tags,
        entityIds: namedEntities.map(e => e.nes_id).filter((id): id is string => Boolean(id)),
        locationIds: locationEntities.map(l => l.nes_id).filter((id): id is string => Boolean(id)),
      };
    });
  }, [casesData, resolvedEntities, currentLang]);

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
                {[1, 2, 3].map((i) => (
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
