import { Button } from "@/components/ui/button";
import { CaseCard } from "@/components/CaseCard";
import { Hero } from "@/components/home/hero";
import { Faq } from "@/components/home/faq";
import { ReportCaseCta } from "@/components/home/report-case-cta";
import { SupportingPartner } from "@/components/home/supportingpartner";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { getCases, getStatistics } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import { useEffect, useMemo, useState } from "react";

import type { Entity } from "@/types/entity";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { getSubjectEntities } from "@/utils/case-entities";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const [resolvedEntities, setResolvedEntities] = useState<Record<string, Entity>>({});

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

  const { data: casesData } = useQuery({
    queryKey: ['cases', { page: 1 }],
    queryFn: () => getCases({ page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  // Resolve location entities from the registry
  useEffect(() => {
    if (!casesData?.results) return;

    let isMounted = true;

    const resolveEntities = async () => {
      const allEntities = casesData.results.flatMap(c => c.entities || []);
      const locationEntities = allEntities.filter(e => e.type === 'location');
      const uniqueNesIds = [...new Set(locationEntities.map(e => e.nes_id!).filter(Boolean))];

      const entityPromises = uniqueNesIds.map(async (nesId) => {
        try {
          const entity = await getEntityById(nesId);
          return { id: nesId, entity };
        } catch {
          return null;
        }
      });

      const entities = await Promise.all(entityPromises);

      // Only update state if component is still mounted
      if (isMounted) {
        const entitiesMap = entities.reduce((acc, item) => {
          if (item) acc[item.id] = item.entity;
          return acc;
        }, {} as Record<string, Entity>);
        setResolvedEntities(entitiesMap);
      }
    };

    resolveEntities();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [casesData]);

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
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Jawafdehi — Nepal's Corruption Case Archive" />
        <meta name="twitter:description" content="Every CIAA corruption case documented, simplified, and permanently accessible. Nepal's authoritative public record of corruption cases and official documents." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
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
                "urlTemplate": "https://jawafdehi.org/cases?search={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            },
            {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://jawafdehi.org/entities?search={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          ]
        })}</script>
      </Helmet>

      <main id="main-content" className="flex-1">
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
                <h2 className="text-2xl font-bold text-foreground">Recently Documented Cases</h2>
                <p className="text-muted-foreground mt-1">Latest cases added to the archive</p>
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
                  View all cases <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <ReportCaseCta />
        <Faq />
        <SupportingPartner />
      </main>

    </div>
  );
};

export default Index;
