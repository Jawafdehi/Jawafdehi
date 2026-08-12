import { FormEvent, MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, LayoutGrid, List, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import {
  SearchFilters,
  SearchFiltersSkeleton,
  type SidebarFilterName,
} from "@/components/search/SearchFilters";
import {
  SearchResultCard,
  SearchResultCardSkeleton,
} from "@/components/search/SearchResultCard";
import { CaseCardSkeleton } from "@/components/CaseCardSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { searchArchive } from "@/services/search-api";
import type {
  ArchiveSearchFacets,
  ArchiveSearchParams,
  ArchiveSearchResponse,
  ArchiveSearchResult,
  ArchiveSearchResultType,
  ArchiveSearchSort,
  ArchiveSearchType,
} from "@/types/search";
import { cn } from "@/lib/utils";
import {
  normalizeArchiveSearchParams,
  setArchiveSearchParam,
  toggleArchiveSearchParam,
} from "@/utils/archive-search-params";
import { getFacetItemLabel } from "@/utils/case-entities";
import { trackEvent } from "@/utils/analytics";
import { sendSearchClick } from "@/utils/searchClick";
import { Seo } from "@/components/Seo";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

type RefinementName = SidebarFilterName | "type";

const validSorts = new Set<ArchiveSearchSort>([
  "relevance",
  "newest",
  "oldest",
  "title",
]);
const archiveSearchPageSize = 12;
const emptyFacets: ArchiveSearchFacets = {
  entity_type: [],
  case_type: [],
  tags: [],
  status: [],
};

// When `lockedType` is set the page is a single-type browse view (e.g. the data-lake
// Materials / Court-cases landing pages reuse this component): the record-type is
// pinned, the type selector is hidden, and the heading/SEO are overridden.
export interface ArchiveSearchProps {
  lockedType?: ArchiveSearchResultType;
  heading?: string;
  description?: string;
  // Type-specific search input placeholder for locked-type browse pages
  // (materials/court cases). Falls back to the generic archive placeholder.
  placeholder?: string;
  canonicalPath?: string;
}

export default function ArchiveSearch({
  lockedType,
  heading,
  description,
  placeholder,
  canonicalPath,
}: ArchiveSearchProps = {}) {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRecordType = useMemo(
    () => lockedType ?? readRecordType(searchParams),
    [searchParams, lockedType],
  );
  const params = useMemo(
    () => readParams(searchParams, selectedRecordType),
    [searchParams, selectedRecordType],
  );
  const [query, setQuery] = useState(params.q || "");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  useEffect(() => setQuery(params.q || ""), [params.q]);
  useEffect(() => {
    const normalized = normalizeArchiveSearchParams(searchParams);
    if (normalized.toString() !== searchParams.toString()) {
      setSearchParams(normalized, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const {
    data,
    isError,
    isFetching,
    isLoading,
    isPlaceholderData,
    refetch,
  } = useQuery({
    queryKey: ["archive-search", params],
    queryFn: () => searchArchive(params),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });
  const [lastSuccessfulData, setLastSuccessfulData] =
    useState<ArchiveSearchResponse>();

  useEffect(() => {
    if (data && !isPlaceholderData && !isError) {
      setLastSuccessfulData(data);
    }
  }, [data, isError, isPlaceholderData]);

  // Report genuine archive searches to GA4. Fire once per distinct query term
  // (deduped via the ref) when fresh results land — never on pagination, sort,
  // or filter refinements of the same term, and never for term-less browsing.
  const lastTrackedQuery = useRef<string | null>(null);
  useEffect(() => {
    const term = params.q?.trim();
    if (!term || !data || isPlaceholderData || isError) return;
    if (lastTrackedQuery.current === term) return;
    lastTrackedQuery.current = term;
    trackEvent("view_search_results", {
      search_term: term,
      result_type: selectedRecordType,
      results_count: data.count,
    });
  }, [params.q, data, isPlaceholderData, isError, selectedRecordType]);

  const displayData = data || lastSuccessfulData;
  const isInitialLoading = isLoading && !displayData;
  const isRefreshing = isFetching && !isInitialLoading;
  const showError = isError && !isFetching;
  const showFilters = isInitialLoading || Boolean(displayData);

  // Share metadata. This component backs three routes — /search, /materials and
  // /courtcases (see Materials.tsx and CourtCases.tsx, which pass heading,
  // description and canonicalPath) — so all three inherit whatever is set here.
  // Until now that was a title, a description and a canonical, and no og: tags
  // at all: a share of any of the three rendered as a bare link with no card.
  //
  // The fallbacks come from i18n rather than being hardcoded English, so the
  // <title> matches the <h1> the page actually renders. The previous literals
  // were a third paraphrase of the archive description, alongside the two in
  // en.json and ne.json.
  const pageHeading = heading || t("archiveSearch.heading", "Archive Search");
  const pageDescription =
    description ||
    t(
      "archiveSearch.description",
      "Search Jawafdehi's public accountability archive across cases, people, offices, locations, charges, and evidence documents.",
    );

  // Every URL on this site 307s to its trailing-slash form, so a canonical
  // without one points at a redirect. Materials and CourtCases both pass a path
  // with no trailing slash; normalise here rather than in the callers, so a
  // future caller cannot reintroduce it.
  const canonicalUrl = useMemo(() => {
    const path = canonicalPath || "/search/";
    return `${SITE_URL}${path.endsWith("/") ? path : `${path}/`}`;
  }, [canonicalPath]);

  // A result set is not a landing page. The bare browse view of each of these
  // three routes is worth indexing; the same view narrowed by a query or paged
  // past the first is thin, near-duplicate content, and Google's own guidance is
  // to keep internal search results out of the index. `follow` is deliberate —
  // the crawler should still walk through to the records themselves.
  //
  // This is a meta tag and not a robots.txt rule on purpose: a disallowed URL is
  // never fetched, so the crawler would never read the tag that drops it, and
  // /search is listed in sitemap.xml — which robots.txt would then contradict.
  // See the note at the bottom of public/robots.txt.
  const isFilteredResultSet = Boolean(params.q) || params.page > 1;

  const updateParams = (updates: Record<string, string | number | undefined>) => {
    let next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([name, value]) => {
      next = setArchiveSearchParam(next, name, value);
    });
    setSearchParams(next);
  };

  const updateFilter = (name: string, value?: string) => {
    updateParams({ [name]: value, page: 1 });
  };

  const toggleRefinement = (name: SidebarFilterName, value: string) => {
    setSearchParams(
      toggleArchiveSearchParam(searchParams, name, value),
    );
  };

  const updateRecordType = (type?: ArchiveSearchType) => {
    let next = setArchiveSearchParam(searchParams, "type", type || "all");
    next = setArchiveSearchParam(next, "page", 1);
    // The "Entity type" facet only renders while browsing Entities, so leaving a
    // stale entity_type behind would silently filter the new record type through
    // a control the user can no longer see.
    if (type !== "entity") next.delete("entity_type");
    setSearchParams(next);
  };

  const removeRefinement = (name: RefinementName, value: string) => {
    if (name === "type") {
      updateRecordType(undefined);
      return;
    }
    toggleRefinement(name, value);
  };

  const clearRefinements = () => {
    const next = new URLSearchParams(searchParams);
    (
      ["type", "entity_type", "case_type", "tags"] as RefinementName[]
    ).forEach((name) => next.delete(name));
    next.delete("page");
    setSearchParams(next);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams({ q: query.trim() || undefined, page: 1 });
  };

  const selectedSidebarFilters = {
    entity_type: params.entity_type || [],
    case_type: params.case_type || [],
    tags: params.tags || [],
  };
  const selectedRefinements = {
    ...selectedSidebarFilters,
    // On a locked single-type page the type isn't a removable refinement.
    type:
      lockedType || selectedRecordType === "all" ? [] : [selectedRecordType],
  };
  const activeRefinementCount = Object.values(selectedRefinements).reduce(
    (count, values) => count + values.length,
    0,
  );
  const facets = displayData?.facets || emptyFacets;
  const selectedItems = getSelectedItems(facets, selectedRefinements, t);
  const searchFilters = showFilters ? (
    isInitialLoading ? (
      <SearchFiltersSkeleton />
    ) : (
      <SearchFilters
        counts={displayData?.counts || {}}
        facets={facets}
        hideTypeSelector={Boolean(lockedType)}
        onClear={clearRefinements}
        onToggle={toggleRefinement}
        onTypeChange={updateRecordType}
        selected={selectedSidebarFilters}
        selectedType={selectedRecordType}
      />
    )
  ) : null;

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <Seo
        title={`${pageHeading} | ${SITE_NAME}`}
        description={pageDescription}
        canonicalUrl={canonicalUrl}
        language={i18n.language}
        robots={isFilteredResultSet ? "noindex, follow" : null}
      />

      <div className="container mx-auto px-4">
        <header className="max-w-3xl">

          <h1 className="mt-3 text-3xl font-extrabold text-primary md:text-4xl">
            {heading || t("archiveSearch.heading", "Archive Search")}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {description ||
              t(
                "archiveSearch.description",
                "Search Jawafdehi's public accountability archive across cases, people, offices, locations, allegations, and evidence documents.",
              )}
          </p>
          <Link
            className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
            to="/data-quality"
          >
            <span className="relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 group-hover:after:scale-x-100">
              {t("archiveSearch.coverageLink", "See what we cover")}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </header>

        <form
          className="mt-7 flex w-full flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={submitSearch}
        >
          <label className="sr-only" htmlFor="archive-search">
            {t("archiveSearch.searchLabel", "Search the Jawafdehi archive")}
          </label>
          <SearchBar
            className="lg:max-w-[min(64rem,calc(100%-16rem))]"
            id="archive-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              placeholder ||
              t(
                "archiveSearch.placeholder",
                "Search cases, people, offices, locations, or allegations",
              )
            }
            submitLabel={t("archiveSearch.submit", "Search archive")}
            value={query}
          />
          <div className="flex w-full flex-wrap items-center gap-3 lg:ml-auto lg:w-auto lg:flex-nowrap lg:justify-end">
            <div
              aria-live="polite"
              className="flex min-h-5 w-full items-center text-sm font-medium text-muted-foreground sm:mr-auto sm:w-auto sm:whitespace-nowrap lg:mr-1"
            >
              {isInitialLoading || isRefreshing ? (
                <>
                  <span className="sr-only">
                    {t("archiveSearch.searching", "Searching archive")}
                  </span>
                  <Skeleton aria-hidden="true" className="h-4 w-20" />
                </>
              ) : showError ? null : (
                t("archiveSearch.results", "{{count}} results", {
                  count: displayData?.count || 0,
                })
              )}
            </div>
            <div
              aria-label={t("archiveSearch.viewMode", "View mode")}
              className="flex items-center rounded-full border p-0.5"
              role="group"
            >
              <Button
                aria-label={t("archiveSearch.listView", "List view")}
                aria-pressed={viewMode === "list"}
                className="h-9 w-9 rounded-full"
                onClick={() => setViewMode("list")}
                size="icon"
                type="button"
                variant={viewMode === "list" ? "secondary" : "ghost"}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                aria-label={t("archiveSearch.cardView", "Card view")}
                aria-pressed={viewMode === "card"}
                className="h-9 w-9 rounded-full"
                onClick={() => setViewMode("card")}
                size="icon"
                type="button"
                variant={viewMode === "card" ? "secondary" : "ghost"}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <label className="text-sm font-semibold text-muted-foreground" htmlFor="archive-sort">
              {t("archiveSearch.sort", "Sort")}
            </label>
            <Select onValueChange={(sort) => updateFilter("sort", sort)} value={params.sort || "relevance"}>
              <SelectTrigger className="h-11 min-w-0 flex-1 rounded-full px-4 sm:w-[160px] sm:flex-none" id="archive-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        {selectedItems.length ? (
          <div
            aria-label="Selected filters"
            className="mt-3 flex flex-wrap gap-2"
          >
            {selectedItems.map((item) => (
              <button
                className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary-surface/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary-surface/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                key={`${item.name}-${item.value}`}
                onClick={() => removeRefinement(item.name, item.value)}
                type="button"
              >
                <span className="truncate">{item.label}</span>
                <X aria-hidden="true" className="h-3 w-3 shrink-0" />
              </button>
            ))}
          </div>
        ) : null}

        {showFilters ? (
          <div className="mt-5 lg:hidden">
            <details className="rounded-xl bg-card">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
                Filters{activeRefinementCount ? ` (${activeRefinementCount})` : ""}
              </summary>
              <div className="border-t p-3">{searchFilters}</div>
            </details>
          </div>
        ) : null}

        <div
          className={cn(
            "mt-7 grid items-start gap-7",
            showFilters && "lg:grid-cols-[250px_minmax(0,1fr)]",
          )}
        >
          {showFilters ? (
            <div className="hidden self-start lg:block">{searchFilters}</div>
          ) : null}

          <section
            aria-busy={isInitialLoading || isRefreshing}
            aria-label="Archive search results"
            className="min-w-0 self-start"
          >
            {showError ? (
              <Alert className="mb-5" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>
                    {(params.page ?? 1) > 1
                      ? "That results page is out of range. Return to the first page to keep searching."
                      : "Archive search could not be loaded."}
                  </span>
                  <Button
                    // A common cause is an out-of-range page (e.g. a stale
                    // ?page=9999 URL): plain refetch would re-request the same
                    // bad page and never recover (BB-14). Reset to page 1 to
                    // escape it; otherwise retry the current query.
                    onClick={() =>
                      (params.page ?? 1) > 1 ? updateParams({ page: 1 }) : refetch()
                    }
                    size="sm"
                    variant="outline"
                  >
                    {(params.page ?? 1) > 1 ? "Back to first page" : "Retry"}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            <ArchiveSearchResults
              data={displayData}
              isError={showError}
              isLoading={isInitialLoading || isRefreshing}
              searchTerm={params.q}
              viewMode={viewMode}
            />

            {!showError &&
            !isFetching &&
            !isPlaceholderData &&
            data &&
            data.count > data.page_size ? (
              <PaginationControls
                onPageChange={(page) => updateParams({ page })}
                page={data.page}
                pageSize={data.page_size}
                totalItems={data.count}
              />
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function readRecordType(searchParams: URLSearchParams): ArchiveSearchType {
  const requestedType = searchParams.get("type");
  return ["all", "entity", "material", "courtcase", "case"].includes(
    requestedType || "",
  )
    ? (requestedType as ArchiveSearchType)
    : "all";
}

function readParams(
  searchParams: URLSearchParams,
  selectedRecordType: ArchiveSearchType,
): ArchiveSearchParams {
  const requestedSort = searchParams.get("sort") as ArchiveSearchSort | null;
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  return {
    q: searchParams.get("q") || undefined,
    type: selectedRecordType === "all" ? undefined : selectedRecordType,
    // Only honour entity_type while browsing Entities. A hand-edited or
    // bookmarked URL can still carry it into another record type, where the
    // facet is hidden and the filter would drop results with no visible cause.
    entity_type:
      selectedRecordType === "entity"
        ? searchParams.getAll("entity_type")
        : [],
    case_type: searchParams.getAll("case_type"),
    tags: searchParams.getAll("tags"),
    sort: requestedSort && validSorts.has(requestedSort) ? requestedSort : "relevance",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: archiveSearchPageSize,
  };
}

const cardGridClass = "grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3";

function ArchiveSearchResults({
  data,
  isError,
  isLoading,
  searchTerm,
  viewMode,
}: Readonly<{
  data: ArchiveSearchResponse | undefined;
  isError: boolean;
  isLoading: boolean;
  searchTerm?: string;
  viewMode: "list" | "card";
}>) {
  const { t } = useTranslation();
  const searchingLabel = t("archiveSearch.searching", "Searching archive");
  if (isLoading) {
    if (viewMode === "card") {
      return (
        <output aria-label={searchingLabel} className={cardGridClass}>
          {Array.from({ length: archiveSearchPageSize }, (_, index) => (
            <CaseCardSkeleton key={index} />
          ))}
        </output>
      );
    }
    return (
      <div
        aria-label={searchingLabel}
        aria-live="polite"
        className="space-y-3"
        role="status"
      >
        {Array.from({ length: archiveSearchPageSize }, (_, index) => (
          <SearchResultCardSkeleton
            key={index}
            showTags={index % 2 === 1}
          />
        ))}
      </div>
    );
  }

  if (isError) return null;

  if (!data?.results.length) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <h2 className="text-lg font-bold text-foreground">No archive records found</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Try a broader term or remove one of the filters.
        </p>
      </div>
    );
  }

  // 1-based rank across the whole result set (accounts for the current page),
  // sent with each result click so we can measure rank-of-first-click.
  const rankOf = (index: number) => (data.page - 1) * data.page_size + index + 1;

  if (viewMode === "card") {
    return (
      <div className={cardGridClass}>
        {data.results.map((result, index) => (
          <TrackedSearchResult
            key={`${result.type}-${result.id}`}
            rank={rankOf(index)}
            result={result}
            searchId={data.search_id}
            searchTerm={searchTerm}
            viewMode="card"
          >
            <SearchResultCard result={result} viewMode="card" />
          </TrackedSearchResult>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.results.map((result, index) => (
        <TrackedSearchResult
          key={`${result.type}-${result.id}`}
          rank={rankOf(index)}
          result={result}
          searchId={data.search_id}
          searchTerm={searchTerm}
          viewMode="list"
        >
          <SearchResultCard result={result} viewMode="list" />
        </TrackedSearchResult>
      ))}
    </div>
  );
}

// Wraps a result so a click that navigates to the record (lands on an <a>, not a
// tag/filter button) reports the selection two ways: the GA4
// `select_search_result` event (consent-gated) AND a server-side click beacon
// join-keyed by `searchId` (consent-free, no identity) that lets the backend
// learn which result was chosen at what rank — the ground truth GA's ~24% sample
// cannot give.
function TrackedSearchResult({
  rank,
  result,
  searchId,
  searchTerm,
  viewMode,
  children,
}: Readonly<{
  rank: number;
  result: ArchiveSearchResult;
  searchId?: string;
  searchTerm?: string;
  viewMode: "list" | "card";
  children: ReactNode;
}>) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target as HTMLElement).closest("a")) return;
    trackEvent("select_search_result", {
      result_type: result.type,
      rank,
      search_term: searchTerm || undefined,
    });
    sendSearchClick({ searchId, rank, result });
  };
  // `h-full` keeps card-grid cell heights consistent (inner card stretches to
  // fill); list view needs no wrapper sizing.
  return (
    <div className={viewMode === "card" ? "h-full" : undefined} onClick={handleClick}>
      {children}
    </div>
  );
}

function getSelectedItems(
  facets: ArchiveSearchFacets,
  selected: Record<RefinementName, string[]>,
  translate: (key: string) => string,
) {
  // Selected-filter pill labels are localized via getFacetItemLabel. The "type"
  // refinement has no facet group (it's the record-type radio), so it falls back
  // to a humanized value. `facets` carries {name, count} under the unified contract.
  return (Object.keys(selected) as RefinementName[]).flatMap((name) =>
    selected[name].map((value) => {
      const facetItem =
        name === "type"
          ? { name: value }
          : facets[name].find((item) => item.name === value) ?? { name: value };
      return { name, value, label: getFacetItemLabel(name, facetItem, translate) };
    }),
  );
}
