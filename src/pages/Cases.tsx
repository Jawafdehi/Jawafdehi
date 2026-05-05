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
import { CaseCardSkeleton } from "@/components/CaseCardSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle, Filter } from "lucide-react";
import { getCases } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import { useQuery, useQueries } from "@tanstack/react-query";
import { formatDateWithBS } from "@/utils/date";
import { translateDynamicText } from "@/lib/translate-dynamic-content";
import type { Case } from "@/types/jds";

/**
 * Categorizes a case based on its date fields
 * @param caseItem - The case object with date fields
 * @returns Status category: 'ongoing' | 'closed' | 'others'
 */
function getCaseStatus(caseItem: Case): 'ongoing' | 'closed' | 'others' {
  const { case_start_date, case_end_date } = caseItem;
  
  // Safely handle null, undefined, and empty strings
  const hasStartDate = case_start_date && case_start_date.trim() !== '';
  const hasEndDate = case_end_date && case_end_date.trim() !== '';
  
  if (hasStartDate && !hasEndDate) {
    return 'ongoing';
  }
  
  if (hasStartDate && hasEndDate) {
    return 'closed';
  }
  
  return 'others';
}

const Cases = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'closed' | 'others'>('all');

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
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      caseItem.title.toLowerCase().includes(query) ||
      caseItem.description.toLowerCase().includes(query) ||
      (caseItem.tags || []).some(tag => tag.toLowerCase().includes(query));
    
    const caseStatus = getCaseStatus(caseItem);
    const matchesStatus = statusFilter === "all" || caseStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
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

      <main id="main-content" className="flex-1 py-8 md:py-12">
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

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'ongoing' | 'closed' | 'others')}>
                  <SelectTrigger className="h-11 rounded-full">
                    <SelectValue placeholder={t("cases.filterByStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("cases.allStatuses")}</SelectItem>
                    <SelectItem value="ongoing">{t("cases.status.ongoing")}</SelectItem>
                    <SelectItem value="closed">{t("cases.status.closed")}</SelectItem>
                    <SelectItem value="others">{t("cases.status.others")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                {t("cases.clearFilters")}
              </Button>
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
            <div role="status" aria-label={t("cases.loading")} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CaseCardSkeleton key={i} />
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
                });
                const entityDisplayName = entityNames.join(', ') || translateDynamicText('Unknown Entity', currentLang);

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
                    slug={caseItem.slug}
                    title={caseItem.title}
                    entity={entityDisplayName}
                    entityNames={entityNames}
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
