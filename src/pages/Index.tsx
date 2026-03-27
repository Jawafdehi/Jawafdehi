import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { CaseCard } from "@/components/CaseCard";
import { FileText, Users, Eye, CheckCircle2, Shield, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getCases, getStatistics } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import { useMemo, useState, useEffect } from "react";
import { formatDateWithBS } from "@/utils/date";
import type { Entity } from "@/types/nes";
import { translateDynamicText } from "@/lib/translate-dynamic-content";

const Index = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [resolvedEntities, setResolvedEntities] = useState<Record<string, Entity>>({});

  // Fetch real statistics from API
  const { data: stats, isError: statsError, isLoading: statsLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes to match cache
    retry: 2,
  });

  // Helper to display stat values: show "-" if error/loading, otherwise show the value
  const getStatValue = (value: number | undefined): string => {
    if (statsError || statsLoading) return "-";
    return value?.toString() || "0";
  };

  // Fetch real cases from API (first 3 for featured section)
  const { data: casesData } = useQuery({
    queryKey: ['cases', { page: 1 }],
    queryFn: () => getCases({ page: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  // Resolve location entities from NES
  useEffect(() => {
    if (!casesData?.results) return;

    const resolveEntities = async () => {
      const allEntities = casesData.results.flatMap(c => c.entities || []);
      const locationEntities = allEntities.filter(e => e.type === 'related' && e.nes_id?.includes('location'));
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
      const entitiesMap = entities.reduce((acc, item) => {
        if (item) acc[item.id] = item.entity;
        return acc;
      }, {} as Record<string, Entity>);
      setResolvedEntities(entitiesMap);
    };

    resolveEntities();
  }, [casesData]);

  // Transform API cases to CaseCard format
  const featuredCases = useMemo(() => {
    if (!casesData?.results) return [];

    return casesData.results.slice(0, 3).map((caseItem) => {
      // Get alleged entities and locations from unified entities array
      const allegedEntities = caseItem.entities?.filter(e => e.type === 'alleged') || [];
      const locationEntities = caseItem.entities?.filter(e => e.type === 'related' && e.nes_id?.includes('location')) || [];

      const primaryEntity = allegedEntities[0]?.display_name || "Unknown Entity";

      // Translate location names using NES resolution
      const locationNames = locationEntities.map(e => {
        if (e.nes_id && resolvedEntities[e.nes_id]) {
          const entity = resolvedEntities[e.nes_id];
          const name = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id;
          return translateDynamicText(name, currentLang);
        }
        const name = e.display_name || e.nes_id || 'Unknown';
        return translateDynamicText(name, currentLang);
      }).join(', ') || translateDynamicText('Unknown Location', currentLang);

      const formattedDate = caseItem.case_start_date
        ? formatDateWithBS(caseItem.case_start_date, 'PPP')
        : formatDateWithBS(caseItem.created_at, 'PPP');

      return {
        id: caseItem.id.toString(),
        title: caseItem.title,
        entity: primaryEntity,
        location: locationNames,
        date: formattedDate,
        status: "ongoing" as const, // All published cases shown as ongoing
        allegations: caseItem.key_allegations,
        description: caseItem.description.replace(/<[^>]*>/g, '').substring(0, 200),
        thumbnailUrl: caseItem.thumbnail_url ?? undefined,
        tags: caseItem.tags,
        entityIds: allegedEntities.map(e => e.id),
        locationIds: locationEntities.map(l => l.id),
      };
    });
  }, [casesData, resolvedEntities, currentLang]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Jawafdehi Nepal | Transparency & Anti-Corruption</title>
        <meta name="description" content="Jawafdehi documents corruption cases in Nepal. Browse verified cases, track accountability, and promote transparency." />
      </Helmet>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-primary via-navy-dark to-slate-800 py-20 md:py-32">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm text-primary-foreground mb-6">
                <Shield className="mr-2 h-4 w-4" />
                {t("home.hero.badge")}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6">
                {t("home.hero.title")}
              </h1>
              <p className="text-xl text-primary-foreground/80 mb-8 leading-relaxed">
                {t("home.hero.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Link to="/cases">
                    <Search className="mr-2 h-5 w-5" />
                    {t("home.hero.browseCases")}
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary-foreground/20 text-primary">
                  <Link to="/about">{t("home.hero.learnMore")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard
                title={t("home.stats.totalCases")}
                value={getStatValue(stats?.published_cases)}
                icon={FileText}
                description={t("home.stats.totalCasesDesc")}
              />
              <StatCard
                title={t("home.stats.entitiesTracked")}
                value={getStatValue(stats?.entities_tracked)}
                icon={Users}
                description={t("home.stats.entitiesTrackedDesc")}
              />
            </div>
          </div>
        </section>

        {/* Featured Cases Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-3">{t("home.featuredCases.title")}</h2>
              <p className="text-muted-foreground">{t("home.featuredCases.description")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {featuredCases.map((caseItem) => (
                <CaseCard key={caseItem.id} {...caseItem} />
              ))}
            </div>
            <div className="text-center">
              <Button size="lg" variant="outline" asChild>
                <Link to="/cases">{t("home.featuredCases.viewAll")}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-foreground mb-6">{t("home.mission.title")}</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                {t("home.mission.description")}
              </p>
              <Button size="lg" asChild>
                <Link to="/about">{t("home.mission.aboutPlatform")}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-primary to-navy-dark">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-primary-foreground mb-4">
                {t("home.cta.title")}
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8">
                {t("home.cta.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Link to="/report">{t("home.cta.reportAllegation")}</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary-foreground/20 text-primary">
                  <Link to="/feedback">{t("home.cta.submitFeedback")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
