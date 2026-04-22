import { Footer } from "@/components/Footer";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { CaseCard } from "@/components/CaseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle } from "lucide-react";
import { getCases } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import { useQuery, useQueries } from "@tanstack/react-query";
import { formatDateWithBS } from "@/utils/date";
import { translateDynamicText } from "@/lib/translate-dynamic-content";

const Cases = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: casesData, isLoading: loading, isError, refetch } = useQuery({
    queryKey: ['cases', { page: 1 }],
    queryFn: () => getCases({ page: 1 }),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const cases = casesData?.results ?? [];

  const uniqueNesIds = [...new Set(
    cases.flatMap(c => c.entities || []).filter(e => e.nes_id).map(e => e.nes_id!)
  )];

  const entityQueries = useQueries({
    queries: uniqueNesIds.map((nesId) => ({
      queryKey: ['nes-entity', nesId],
      queryFn: () => getEntityById(nesId),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  const resolvedEntities = Object.fromEntries(
    uniqueNesIds.map((nesId, i) => [nesId, entityQueries[i]?.data]).filter(([, v]) => v)
  );

  const filteredCases = cases.filter((caseItem) => {
    const matchesSearch =
      caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all";
    const matchesType = typeFilter === "all" || caseItem.case_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Corruption Cases | Jawafdehi Nepal</title>
        <meta name="description" content="Browse verified corruption and misconduct cases in Nepal. Search by entity, location, or case type. All cases are documented with evidence and sources." />
        <link rel="canonical" href="https://jawafdehi.org/cases" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/cases" />
        <meta property="og:title" content="Corruption Cases | Jawafdehi Nepal" />
        <meta property="og:description" content="Browse verified corruption and misconduct cases in Nepal. Search by entity, location, or case type. All cases are documented with evidence and sources." />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Corruption Cases | Jawafdehi Nepal" />
        <meta name="twitter:description" content="Browse verified corruption and misconduct cases in Nepal. Search by entity, location, or case type. All cases are documented with evidence and sources." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
      </Helmet>
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-3">{t("cases.title")}</h1>
            <p className="text-muted-foreground text-lg">{t("cases.description")}</p>
          </div>

          {/* Search and Filter Section */}
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-[1.5]">
              <label htmlFor="case-search" className="sr-only">
                {t("cases.searchPlaceholder")}
              </label>
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="case-search"
                placeholder={t("cases.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-full pl-11"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-[1.15]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="case-status-filter" aria-label={t("cases.filterByStatus")} className="h-11 rounded-full px-4">
                  <SelectValue placeholder={t("cases.filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("cases.allStatuses")}</SelectItem>
                  <SelectItem value="ongoing">{t("cases.status.ongoing")}</SelectItem>
                  <SelectItem value="under-investigation">{t("cases.status.underInvestigation")}</SelectItem>
                  <SelectItem value="resolved">{t("cases.status.resolved")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="case-type-filter" aria-label={t("cases.filterByType")} className="h-11 rounded-full px-4">
                  <SelectValue placeholder={t("cases.filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("cases.allTypes")}</SelectItem>
                  <SelectItem value="CORRUPTION">{t("cases.type.corruption")}</SelectItem>
                  <SelectItem value="PROMISES">{t("cases.type.brokenPromise")}</SelectItem>
                </SelectContent>
              </Select>

            </div>
          </div>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {loading ? t("cases.loading") : t("cases.showing", { count: filteredCases.length, total: cases.length })}
            </p>
          </div>

          {/* Cases Grid */}
          {isError ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{t("cases.failedToLoad")}</span>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                  {t("cases.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border rounded-lg p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredCases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* NOTE: Dynamic case content (title, description, entity names) from Entity API
                  remains in English until API-side i18n is implemented. See GitHub issue for i18n. */}
              {filteredCases.map((caseItem) => {
                // Get accused and location entities from unified entities array
                const accusedEntities = caseItem.entities?.filter(e => e.type === 'accused') || [];
                const locationEntities = caseItem.entities?.filter(e => e.type === 'location') || [];
                
                // Translate entity names
                const entityNames = accusedEntities.map(e => {
                  if (e.nes_id && resolvedEntities[e.nes_id]) {
                    const entity = resolvedEntities[e.nes_id];
                    return entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id;
                  }
                  return e.display_name || e.nes_id || translateDynamicText('Unknown Entity', currentLang);
                }).join(', ') || translateDynamicText('Unknown Entity', currentLang);

                // Translate location names
                const locationNames = locationEntities.map(e => {
                  if (e.nes_id && resolvedEntities[e.nes_id]) {
                    const entity = resolvedEntities[e.nes_id];
                    const name = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id;
                    return translateDynamicText(name, currentLang);
                  }
                  const name = e.display_name || e.nes_id || 'Unknown';
                  return translateDynamicText(name, currentLang);
                }).join(', ') || translateDynamicText('Unknown Location', currentLang);

                return (
                  <CaseCard
                    key={caseItem.id}
                    id={caseItem.id.toString()}
                    title={caseItem.title}
                    entity={entityNames}
                    location={locationNames}
                    date={formatDateWithBS(caseItem.created_at, 'PPP')}
                    status="ongoing"
                    tags={caseItem.tags || []}
                    description={caseItem.description.replace(/<[^>]*>/g, '').substring(0, 200)}
                    allegations={caseItem.key_allegations}
                    entityIds={accusedEntities.map(e => e.id)}
                    locationIds={locationEntities.map(e => e.id)}
                    thumbnailUrl={caseItem.thumbnail_url ?? undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                {isError ? t("cases.unableToLoad") : t("cases.noCasesFound")}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setSearchQuery("");
                }}
              >
                {isError ? t("cases.tryAgain") : t("cases.clearAllFilters")}
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />


    </div>
  );
};

export default Cases;
