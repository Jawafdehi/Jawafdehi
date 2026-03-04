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
import { useMemo } from "react";
import { formatDate } from "@/utils/date";

const Index = () => {
  const { t } = useTranslation();

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

  // Transform API cases to CaseCard format
  const featuredCases = useMemo(() => {
    if (!casesData?.results) return [];

    return casesData.results.slice(0, 3).map((caseItem) => {
      const primaryEntity = caseItem.alleged_entities[0]?.display_name || "Unknown Entity";
      const primaryLocation = caseItem.locations[0]?.display_name || "Unknown Location";
      const formattedDate = caseItem.case_start_date
        ? formatDate(caseItem.case_start_date, 'PPP')
        : formatDate(caseItem.created_at, 'PPP');

      return {
        id: caseItem.id.toString(),
        title: caseItem.title,
        entity: primaryEntity,
        location: primaryLocation,
        date: formattedDate,
        status: "ongoing" as const, // All published cases shown as ongoing
        description: caseItem.description.replace(/<[^>]*>/g, '').substring(0, 200), // Strip HTML and truncate
        tags: caseItem.tags,
        entityIds: caseItem.alleged_entities.map(e => e.id),
        locationIds: caseItem.locations.map(l => l.id),
      };
    });
  }, [casesData]);

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
