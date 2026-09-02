import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CaseCard } from "@/components/CaseCard";
import { Seo } from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaseCardSkeleton } from "@/components/CaseCardSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, AlertCircle, Filter, LayoutGrid, List } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { translateDynamicText } from "@/lib/translate-dynamic-content";
import { searchArchive } from "@/services/search-api";
import type { ArchiveSearchResult, CaseSearchCard, CaseSearchCardEntity } from "@/types/search";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

type CaseLifecycleStatus = "ongoing" | "closed" | "others";
type CaseBadgeStatus = "ongoing" | "resolved" | "under-investigation";

type CaseCardViewModel = {
  id: string;
  slug: string | null;
  title: string;
  tags: string[];
  status: CaseLifecycleStatus;
  heroImageUrl?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  bigo: number | null;
  caseType: string | null;
  accusedCount: number;
  timelineCount: number;
  subjectEntities: CaseSearchCardEntity[];
  locationEntities: CaseSearchCardEntity[];
};

const CASES_PAGE_SIZE = 12;

function mapCaseStatusToBadge(status: CaseLifecycleStatus): CaseBadgeStatus {
  switch (status) {
    case "ongoing": return "ongoing";
    case "closed": return "resolved";
    case "others": return "under-investigation";
  }
}

function normalizeStatus(value: string | null | undefined): CaseLifecycleStatus {
  return value === "ongoing" || value === "closed" || value === "others" ? value : "others";
}

function pickTitle(result: ArchiveSearchResult, card?: CaseSearchCard): string {
  // Envelope titles can carry <em> highlight tags; strip them from the fallback.
  return card?.title || stripTags(result.title.en || result.title.ne || result.id);
}

function slugFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = /\/case\/([^/?#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

function subjectEntities(entities: readonly CaseSearchCardEntity[] | undefined): CaseSearchCardEntity[] {
  const list = entities ?? [];
  const accused = list.filter((entity) => entity.type === "accused");
  if (accused.length > 0) return accused;
  return list.filter((entity) => Boolean(entity.type) && entity.type !== "location");
}

function locationEntities(entities: readonly CaseSearchCardEntity[] | undefined): CaseSearchCardEntity[] {
  return (entities ?? []).filter((entity) => entity.type === "location");
}

function entityLabel(entity: CaseSearchCardEntity, currentLang: string): string {
  const name = entity.display_name || entity.nes_id || "Unknown";
  return translateDynamicText(name, currentLang);
}

function toCaseCardViewModel(result: ArchiveSearchResult): CaseCardViewModel {
  const card = result.card;
  return {
    id: result.id,
    slug: card?.slug || slugFromUrl(result.url),
    title: pickTitle(result, card),
    tags: card?.tags || [],
    status: normalizeStatus(card?.status || result.extra.case_status),
    thumbnailUrl: card?.thumbnail_url || undefined,
    bannerUrl: card?.banner_url || undefined,
    // Editor hero (tier 1) — pass-through; the index does not carry it yet.
    heroImageUrl: card?.hero_image_url || undefined,
    // /cases reads the same indexed card payload as /search, so बिगो has to be
    // carried here too — otherwise the shared <CaseCard> shows the amount on the
    // search results and drops it on the browse page.
    bigo: card?.bigo ?? null,
    // Generative-thumbnail (tier 3) inputs. Accused only — the subject-entity
    // fallback would count non-accused parties into an "accused" glyph.
    caseType: card?.case_type ?? null,
    accusedCount: (card?.entities ?? []).filter((entity) => entity.type === "accused").length,
    timelineCount: card?.timeline?.length ?? 0,
    subjectEntities: subjectEntities(card?.entities),
    locationEntities: locationEntities(card?.entities),
  };
}

const Cases = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CaseLifecycleStatus>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Debounce search input and restart cursor pagination atomically by changing the query key.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading: loading, isFetching, isError, refetch, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["cases-search", { search: debouncedSearch, status: statusFilter }],
    queryFn: ({ pageParam }) => searchArchive({
      q: debouncedSearch || undefined,
      type: "case",
      status: statusFilter === "all" ? undefined : [statusFilter],
      sort: debouncedSearch ? "relevance" : "newest",
      page_size: CASES_PAGE_SIZE,
      cursor: pageParam || undefined,
    }),
    initialPageParam: "" as string,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const results = data?.pages.flatMap((page) => page.results) ?? [];
  const cases = results.map(toCaseCardViewModel);
  const totalCount = data?.pages[0]?.count ?? 0;
  const isInitialLoading = loading && cases.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Seo
        title={`Corruption Cases | ${SITE_NAME}`}
        description="Browse verified corruption and misconduct cases in Nepal. Search by entity, location, or case type. All cases are documented with evidence and sources."
        canonicalUrl={`${SITE_URL}/cases/`}
      />

      <div className="flex-1 py-8 md:py-12">
        <div className="layout-container">
          <section id="cases-intro" className="mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-3">{t("cases.title")}</h1>
            <p className="text-muted-foreground text-lg">{t("cases.description")}</p>
          </section>

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
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | CaseLifecycleStatus)}>
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

              {/* gap-1: the two `size="icon"` buttons each carry a tap ring 2px past their
                  painted box, so without 4px of clearance the left button's last 2px
                  activate the right one. Measured before the gap was added. */}
              <div className="flex gap-1 border rounded-md">
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

          <div className="mb-6">
            <p className="text-sm text-muted-foreground">
              {isInitialLoading ? t("cases.loading") : t("cases.showing", { count: cases.length, total: totalCount })}
            </p>
          </div>

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
              cases={cases}
              hasNextPage={Boolean(hasNextPage)}
              currentLang={currentLang}
              isFetching={isFetching}
              fetchNextPage={fetchNextPage}
              setStatusFilter={setStatusFilter}
              setSearchQuery={setSearchQuery}
              t={t}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default Cases;

type CaseResultsProps = Readonly<{
  isInitialLoading: boolean;
  isError: boolean;
  viewMode: "grid" | "list";
  cases: CaseCardViewModel[];
  hasNextPage: boolean;
  currentLang: string;
  isFetching: boolean;
  fetchNextPage: () => void;
  setStatusFilter: (v: "all" | CaseLifecycleStatus) => void;
  setSearchQuery: (v: string) => void;
  t: ReturnType<typeof useTranslation>["t"];
}>;

function CaseResults({
  isInitialLoading, isError, viewMode, cases, hasNextPage,
  currentLang, isFetching, fetchNextPage, setStatusFilter, setSearchQuery, t,
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

  if (cases.length === 0) {
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
        {cases.map((caseItem) => {
          const entityNames = caseItem.subjectEntities.map((entity) => entityLabel(entity, currentLang));
          const locationNames = caseItem.locationEntities.map((entity) => entityLabel(entity, currentLang));
          const entity = entityNames.join(", ") || translateDynamicText("Unknown Entity", currentLang);
          const location = locationNames.join(", ") || translateDynamicText("Unknown Location", currentLang);
          return (
            <CaseCard
              key={caseItem.id}
              id={caseItem.id}
              slug={caseItem.slug}
              title={caseItem.title}
              entity={entity}
              entityNames={entityNames}
              location={location}
              status={mapCaseStatusToBadge(caseItem.status)}
              tags={caseItem.tags}
              entityIds={caseItem.subjectEntities.map((entity) => entity.nes_id).filter((id): id is string => Boolean(id))}
              locationIds={caseItem.locationEntities.map((entity) => entity.nes_id).filter((id): id is string => Boolean(id))}
              bigo={caseItem.bigo}
              heroImageUrl={caseItem.heroImageUrl}
              thumbnailUrl={caseItem.thumbnailUrl}
              bannerUrl={caseItem.bannerUrl}
              caseType={caseItem.caseType}
              accusedCount={caseItem.accusedCount}
              timelineCount={caseItem.timelineCount}
              viewMode={viewMode}
            />
          );
        })}
      </div>
      {!isError && hasNextPage && (
        <div className="mt-8 flex justify-center">
          <Button onClick={() => fetchNextPage()} disabled={isFetching} variant="outline" size="lg">
            {isFetching ? t("cases.loadingMore") : t("cases.loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}
