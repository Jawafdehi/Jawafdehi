import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { CaseCard } from "@/components/CaseCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseCardSkeleton } from "@/components/CaseCardSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle, Filter, LayoutGrid, List } from "lucide-react";
import { getCases } from "@/services/jds-api";
import { getEntityById } from "@/services/api";
import { useQuery, useQueries } from "@tanstack/react-query";

import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { getSubjectEntities } from "@/utils/case-entities";
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

function mapCaseStatusToBadge(status: 'ongoing' | 'closed' | 'others'): 'ongoing' | 'resolved' | 'under-investigation' {
  switch (status) {
    case 'ongoing': return 'ongoing';
    case 'closed': return 'resolved';
    case 'others': return 'under-investigation';
  }
}
const Cases = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'closed' | 'others'>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Debounce search input and reset pagination atomically
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: casesData, isLoading: loading, isFetching, isPlaceholderData, isError, refetch } = useQuery({
    queryKey: ['cases', { page, search: debouncedSearch }],
    queryFn: () => getCases({ page, search: debouncedSearch || undefined }),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    placeholderData: (prev) => prev,
  });

  const [allCases, setAllCases] = useState<Case[]>([]);
  useEffect(() => {
    if (!casesData || isPlaceholderData) return;
    setAllCases(prev => page === 1 ? casesData.results : [...prev, ...casesData.results]);
  }, [casesData, page, isPlaceholderData]);

  const totalCount = casesData?.count ?? 0;
  const isInitialLoading = loading && page === 1 && allCases.length === 0;

  const uniqueNesIds = [...new Set(
    allCases.flatMap(c => c.entities || []).filter(e => e.nes_id).map(e => e.nes_id!)
  )];

  const entityQueries = useQueries({
    queries: uniqueNesIds.map((nesId) => ({
      queryKey: ['entity-record', nesId],
      queryFn: () => getEntityById(nesId),
      staleTime: 10 * 60 * 1000,
      retry: false,
    })),
  });

  const resolvedEntities = Object.fromEntries(
    uniqueNesIds.map((nesId, i) => [nesId, entityQueries[i]?.data]).filter(([, v]) => v)
  );

  const filteredCases = allCases.filter((caseItem) => {
    const caseStatus = getCaseStatus(caseItem);
    const matchesStatus = statusFilter === "all" || caseStatus === statusFilter;
    return matchesStatus;
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

      <main id="main-content" className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <section id="cases-intro" className="mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-3">{t("cases.title")}</h1>
            <p className="text-muted-foreground text-lg">{t("cases.description")}</p>
          </section>

          {/* Search and Filter Section */}
          <section id="case-search-section" className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center">
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

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  aria-label={t("cases.gridView")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  aria-label={t("cases.listView")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {isInitialLoading ? t("cases.loading") : t("cases.showing", { count: filteredCases.length, total: totalCount })}
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

          <section id="case-results">
<CaseResults
              isInitialLoading={isInitialLoading}
              isError={isError}
              viewMode={viewMode}
              filteredCases={filteredCases}
              casesData={casesData}
              resolvedEntities={resolvedEntities}
              currentLang={currentLang}
              searchQuery={searchQuery}
              isFetching={isFetching}
              refetch={refetch}
              setPage={setPage}
              setStatusFilter={setStatusFilter}
              setSearchQuery={setSearchQuery}
              t={t}
            />
          </section>
        </div>
      </main>

    </div>
  );
};

export default Cases;

type CaseResultsProps = Readonly<{
  isInitialLoading: boolean;
  isError: boolean;
  viewMode: "grid" | "list";
  filteredCases: Case[];
  casesData: { count: number; next: string | null } | undefined;
  resolvedEntities: Record<string, unknown>;
  currentLang: string;
  searchQuery: string;
  isFetching: boolean;
  refetch: () => void;
  setPage: (fn: (p: number) => number) => void;
  setStatusFilter: (v: "all" | "ongoing" | "closed" | "others") => void;
  setSearchQuery: (v: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}>;

function CaseResults({
  isInitialLoading, isError, viewMode, filteredCases, casesData, resolvedEntities,
  currentLang, searchQuery, isFetching, refetch, setPage, setStatusFilter, setSearchQuery, t,
}: CaseResultsProps) {
  const gridClass = viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-6";

  if (isInitialLoading) {
    return (
      <output aria-label={t("cases.loading")} className={gridClass}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={viewMode === "list" ? "w-full" : ""}>
            <CaseCardSkeleton />
          </div>
        ))}
      </output>
    );
  }

  if (filteredCases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg mb-4">
          {isError ? t("cases.unableToLoad") : t("cases.noCasesFound")}
        </p>
        <Button variant="outline" onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}>
          {isError ? t("cases.tryAgain") : t("cases.clearAllFilters")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={gridClass}>
        {/* NOTE: Dynamic case content (title, description, entity names) from Entity API
            remains in English until API-side i18n is implemented. See GitHub issue for i18n. */}
        {filteredCases.map((caseItem) => (
          <CaseCard
            key={caseItem.id}
            id={caseItem.id.toString()}
            slug={caseItem.slug}
            title={caseItem.title}
            entity={getEntityDisplayName(caseItem, resolvedEntities, currentLang)}
            entityNames={getEntityNames(caseItem, resolvedEntities, currentLang)}
            location={getLocationNames(caseItem, resolvedEntities, currentLang)}
            status={mapCaseStatusToBadge(getCaseStatus(caseItem))}
            tags={caseItem.tags || []}
            description={(caseItem.short_description ?? '').replace(/<[^>]*>/g, '').substring(0, 200)}
            allegations={caseItem.key_allegations}
            entityIds={(caseItem.entities?.filter(e => e.type === 'accused') || []).map(e => e.nes_id).filter((id): id is string => Boolean(id))}
            locationIds={(caseItem.entities?.filter(e => e.type === 'location') || []).map(e => e.nes_id).filter((id): id is string => Boolean(id))}
            thumbnailUrl={caseItem.thumbnail_url ?? undefined}
            viewMode={viewMode}
          />
        ))}
      </div>
      {!searchQuery && !isError && casesData?.next && (
        <div className="mt-8 flex justify-center">
          <Button onClick={() => setPage(p => p + 1)} disabled={isFetching} variant="outline" size="lg">
            {isFetching ? t("cases.loadingMore") : t("cases.loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}

function getEntityNames(caseItem: Case, resolvedEntities: Record<string, unknown>, currentLang: string): string[] {
  // Subject entities: accused for CORRUPTION cases, else any named (non-location)
  // entity so cases without an accused (e.g. TAX_EVASION) still name a subject.
  const namedEntities = getSubjectEntities(caseItem.entities, e => e.type);
  return namedEntities.map(e => {
    if (e.nes_id && resolvedEntities[e.nes_id]) {
      const entity = resolvedEntities[e.nes_id];
      return entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id;
    }
    return e.display_name || e.nes_id || translateDynamicText('Unknown Entity', currentLang);
  });
}

function getEntityDisplayName(caseItem: Case, resolvedEntities: Record<string, unknown>, currentLang: string): string {
  return getEntityNames(caseItem, resolvedEntities, currentLang).join(', ') || translateDynamicText('Unknown Entity', currentLang);
}

function getLocationNames(caseItem: Case, resolvedEntities: Record<string, unknown>, currentLang: string): string {
  const locationEntities = caseItem.entities?.filter(e => e.type === 'location') || [];
  return locationEntities.map(e => {
    if (e.nes_id && resolvedEntities[e.nes_id]) {
      const entity = resolvedEntities[e.nes_id];
      const name = entity?.names?.[0]?.en?.full || entity?.names?.[0]?.ne?.full || e.display_name || e.nes_id;
      return translateDynamicText(name, currentLang);
    }
    const name = e.display_name || e.nes_id || 'Unknown';
    return translateDynamicText(name, currentLang);
  }).join(', ') || translateDynamicText('Unknown Location', currentLang);
}
