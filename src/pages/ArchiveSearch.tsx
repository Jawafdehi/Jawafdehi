import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import {
  SearchFilters,
  SearchFiltersSkeleton,
  type SidebarFilterName,
} from "@/components/search/SearchFilters";
import {
  SearchResultCard,
  SearchResultCardSkeleton,
} from "@/components/search/SearchResultCard";
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

type RefinementName = SidebarFilterName | "type";

const validSorts = new Set<ArchiveSearchSort>([
  "relevance",
  "newest",
  "oldest",
  "title",
]);
const archiveSearchPageSize = 4;
const emptyFacets: ArchiveSearchFacets = {
  entity_type: [],
  case_type: [],
  tags: [],
};

// When `lockedType` is set the page is a single-type browse view (e.g. the data-lake
// Materials / Court-cases landing pages reuse this component): the record-type is
// pinned, the type selector is hidden, and the heading/SEO are overridden.
export interface ArchiveSearchProps {
  lockedType?: ArchiveSearchResultType;
  heading?: string;
  description?: string;
  canonicalPath?: string;
}

export default function ArchiveSearch({
  lockedType,
  heading,
  description,
  canonicalPath,
}: ArchiveSearchProps = {}) {
  const { t } = useTranslation();
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

  const displayData = data || lastSuccessfulData;
  const isInitialLoading = isLoading && !displayData;
  const isRefreshing = isFetching && !isInitialLoading;
  const showError = isError && !isFetching;
  const showFilters = isInitialLoading || Boolean(displayData);

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
    updateParams({ type: type || "all", page: 1 });
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
    <main id="main-content" className="min-h-screen bg-background py-8 md:py-12">
      <Helmet>
        <title>{heading ? `${heading} | Jawafdehi Nepal` : "Archive Search | Jawafdehi Nepal"}</title>
        <meta
          content={
            description ||
            "Search Jawafdehi's public archive across accountability cases, tracked entities, locations, and evidence documents."
          }
          name="description"
        />
        <link href={`https://jawafdehi.org${canonicalPath || "/search"}`} rel="canonical" />
      </Helmet>

      <div className="container mx-auto px-4">
        <header className="max-w-3xl">

          <h1 className="mt-3 text-3xl font-extrabold text-primary md:text-4xl">
            {heading || "Archive Search"}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {description ||
              "Search Jawafdehi's public accountability archive across cases, people, offices, locations, allegations, and evidence documents."}
          </p>
        </header>

        <form
          className="mt-7 flex w-full flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={submitSearch}
        >
          <label className="sr-only" htmlFor="archive-search">
            Search the Jawafdehi archive
          </label>
          <SearchBar
            className="lg:max-w-[min(64rem,calc(100%-16rem))]"
            id="archive-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cases, people, offices, locations, or allegations"
            submitLabel="Search archive"
            value={query}
          />
          <div className="flex items-center gap-3 lg:ml-auto lg:justify-end">
            <p
              aria-live="polite"
              className="mr-auto flex min-h-5 items-center whitespace-nowrap text-sm font-medium text-muted-foreground lg:mr-1"
            >
              {isInitialLoading || isRefreshing ? (
                <>
                  <span className="sr-only">Searching archive</span>
                  <Skeleton aria-hidden="true" className="h-4 w-20" />
                </>
              ) : showError ? null : `${displayData?.count || 0} results`}
            </p>
            <label className="text-sm font-semibold text-muted-foreground" htmlFor="archive-sort">
              Sort
            </label>
            <Select
              onValueChange={(sort) => updateFilter("sort", sort)}
              value={params.sort || "relevance"}
            >
              <SelectTrigger className="h-11 w-[160px] rounded-full px-4" id="archive-sort">
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
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <details className="rounded-xl border bg-card">
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
                  <span>Archive search could not be loaded.</span>
                  <Button onClick={() => refetch()} size="sm" variant="outline">
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            <ArchiveSearchResults
              data={displayData}
              isError={showError}
              isLoading={isInitialLoading || isRefreshing}
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
    </main>
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
    entity_type: searchParams.getAll("entity_type"),
    case_type: searchParams.getAll("case_type"),
    tags: searchParams.getAll("tags"),
    sort: requestedSort && validSorts.has(requestedSort) ? requestedSort : "relevance",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: archiveSearchPageSize,
  };
}

function ArchiveSearchResults({
  data,
  isError,
  isLoading,
}: Readonly<{
  data: ArchiveSearchResponse | undefined;
  isError: boolean;
  isLoading: boolean;
}>) {
  if (isLoading) {
    return (
      <div
        aria-label="Searching archive"
        aria-live="polite"
        className="space-y-3"
        role="status"
      >
        {[false, true, false, true].map((showTags, index) => (
          <SearchResultCardSkeleton
            key={index}
            showTags={showTags}
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

  return (
    <div className="space-y-3">
      {data.results.map((result) => (
        <SearchResultCard key={`${result.type}-${result.id}`} result={result} />
      ))}
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

