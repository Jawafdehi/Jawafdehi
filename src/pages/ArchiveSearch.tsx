import {
  FormEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, ChevronDown, LayoutGrid, List, X } from "lucide-react";
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
import { SearchTabs } from "@/components/search/SearchTabs";
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
import { describeBigoRange, readBigoBounds } from "@/lib/bigo-range";
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

// "bigo" is a refinement for pill/clear purposes only — it is one removable
// range, not a list of facet tokens, so it never joins the `selected` record the
// checkbox groups are driven from.
type RefinementName = SidebarFilterName | "type";
type PillName = RefinementName | "bigo";

const validSorts = new Set<ArchiveSearchSort>([
  "relevance",
  "newest",
  "oldest",
  "title",
  "featured",
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
// pinned, the type tabs are hidden, and the heading/SEO are overridden.
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
  // Card (grid) view is the default: results lead with the case artwork, status,
  // entities and बिगो rather than a text row. The choice is intentionally NOT
  // persisted across visits or mirrored into the URL — that's a separate change.
  const [viewMode, setViewMode] = useState<"list" | "card">("card");
  // Mobile-only disclosure state for the filter panel. Above `lg` the panel is
  // shown unconditionally by CSS, so this is ignored there (see the panel below).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersPanelId = useId();

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
    // Same for the बिगो range, which only renders while browsing Cases. readParams
    // already declines to send a stale bound, but dropping it from the URL keeps
    // what is shared or bookmarked honest about what is actually applied.
    if (type !== "case") {
      next.delete("bigo_min");
      next.delete("bigo_max");
    }
    setSearchParams(next);
  };

  // One request per COMMITTED range — a thumb release, an arrow key-up, or a
  // typed amount on blur/Enter. The slider owns its position while dragging, so
  // a 20-stop drag is one request rather than twenty and there is nothing here
  // to debounce.
  const updateBigoRange = ({ min, max }: { min?: number; max?: number }) => {
    // Both bounds move as ONE edit. Setting them in sequence through
    // setArchiveSearchParam would re-normalize in between, and a new lower bound
    // momentarily above the OUTGOING upper bound looks inverted at that point —
    // which drops both, losing the half already written.
    const next = new URLSearchParams(searchParams);
    next.delete("bigo_min");
    next.delete("bigo_max");
    if (min !== undefined) next.set("bigo_min", String(min));
    if (max !== undefined) next.set("bigo_max", String(max));
    next.delete("page");
    setSearchParams(normalizeArchiveSearchParams(next));
  };

  const removeRefinement = (name: PillName, value: string) => {
    if (name === "type") {
      updateRecordType(undefined);
      return;
    }
    if (name === "bigo") {
      updateBigoRange({});
      return;
    }
    toggleRefinement(name, value);
  };

  const clearRefinements = () => {
    const next = new URLSearchParams(searchParams);
    (
      ["type", "entity_type", "case_type", "tags", "bigo_min", "bigo_max"] as const
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
    // Record type is represented by the tabs, so duplicating it as a removable
    // filter chip (or in the mobile filter count) would be redundant.
    type: [],
  };
  // The active बिगो range as a single removable pill, labelled with the formatted
  // bounds however it was set — dragged or typed — so a range is never applied
  // invisibly. ONE pill, not one per bound: it is a single refinement, and
  // removing it clears both sides.
  const hasBigoRange =
    params.bigo_min !== undefined || params.bigo_max !== undefined;
  const bigoPill = hasBigoRange
    ? {
        name: "bigo" as const,
        value: "bigo",
        label: describeBigoRange(params.bigo_min, params.bigo_max, t),
      }
    : null;
  const activeRefinementCount =
    Object.values(selectedRefinements).reduce(
      (count, values) => count + values.length,
      0,
    ) + (bigoPill ? 1 : 0);
  const facets = displayData?.facets || emptyFacets;
  const selectedItems = [
    ...getSelectedItems(facets, selectedRefinements, t),
    ...(bigoPill ? [bigoPill] : []),
  ];
  const searchFilters = showFilters ? (
    isInitialLoading ? (
      <SearchFiltersSkeleton selectedType={selectedRecordType} />
    ) : (
      <SearchFilters
        facets={facets}
        onClear={clearRefinements}
        bigoExtent={displayData?.extents?.bigo}
        bigoMax={params.bigo_max}
        bigoMin={params.bigo_min}
        onBigoCommit={updateBigoRange}
        onToggle={toggleRefinement}
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

      <div className="layout-container">
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
              className="flex items-center gap-1 rounded-full border p-0.5"
              role="group"
            >
              {/* Card first, then list — the toggle reads in the same order as
                  the defaults, with the default view in the leading position. */}
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
            </div>
            <label className="text-sm font-semibold text-muted-foreground" htmlFor="archive-sort">
              {t("archiveSearch.sort", "Sort")}
            </label>
            <Select onValueChange={(sort) => updateFilter("sort", sort)} value={params.sort}>
              <SelectTrigger className="h-11 min-w-0 flex-1 rounded-full px-4 sm:w-[160px] sm:flex-none" id="archive-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        {lockedType ? null : (
          <div className="mt-3 lg:max-w-[min(64rem,calc(100%-16rem))]">
            <SearchTabs
              activeType={selectedRecordType}
              onChange={updateRecordType}
            />
          </div>
        )}

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

        {/*
          One grid, one copy of the filter markup. The panel used to be rendered
          twice — once in a mobile <details>, once in the desktop sidebar — so
          both subtrees sat in the DOM at every viewport, doubling the pre-rendered
          payload, the hydration cost, the reconciliation work on every refinement,
          and the "Archive search filters" landmark. Now `display` alone decides
          where the single copy lands: the disclosure button is a grid item only
          below `lg`, so above it the panel takes column 1 and the results column 2.
        */}
        <div
          className={cn(
            "mt-5 grid items-start gap-x-7 gap-y-4 lg:mt-7",
            showFilters && "lg:grid-cols-[250px_minmax(0,1fr)]",
          )}
        >
          {showFilters ? (
            <>
              {/*
                Replaces a native <details>: a <details> cannot be forced open with
                CSS across browsers, so the desktop sidebar could not reuse it.
              */}
              <button
                aria-controls={filtersPanelId}
                aria-expanded={filtersOpen}
                className="flex min-h-11 w-full items-center justify-between rounded-xl bg-card px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
                onClick={() => setFiltersOpen((open) => !open)}
                type="button"
              >
                <span>
                  Filters{activeRefinementCount ? ` (${activeRefinementCount})` : ""}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                    filtersOpen && "rotate-180",
                  )}
                />
              </button>
              {/*
                `lg:block` outranks `hidden` on source order at >=1024px, so the
                desktop sidebar ignores `filtersOpen` entirely and no breakpoint
                hook is needed — which keeps the pre-rendered markup and the first
                client render identical.
              */}
              <div
                className={cn(
                  filtersOpen ? "block" : "hidden",
                  "self-start lg:block",
                )}
                id={filtersPanelId}
              >
                {searchFilters}
              </div>
            </>
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

// The URL's बिगो bounds under the API's own param names.
function readBigoParams(searchParams: URLSearchParams) {
  const { min, max } = readBigoBounds(searchParams);
  return { bigo_min: min, bigo_max: max };
}

function readParams(
  searchParams: URLSearchParams,
  selectedRecordType: ArchiveSearchType,
): ArchiveSearchParams {
  const requestedSort = searchParams.get("sort") as ArchiveSearchSort | null;
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const q = searchParams.get("q") || undefined;
  return {
    q,
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
    // Only honour the बिगो bounds while browsing Cases. No other record type
    // carries an amount, so a bound left over from a case view would empty the
    // results of whatever the reader switched to — with the control that set it
    // no longer on screen. Same gate, and the same reason, as entity_type above.
    //
    // Read through readBigoBounds, NOT by parsing each bound here: an inverted
    // pair parses fine bound-by-bound, and normalizeArchiveSearchParams only
    // repairs the URL an effect later — by which point this render has already
    // sent `bigo_min > bigo_max` and taken a 400.
    ...(selectedRecordType === "case"
      ? readBigoParams(searchParams)
      : { bigo_min: undefined, bigo_max: undefined }),
    // An explicit ?sort wins. Otherwise the default depends on whether there is
    // query text: with none, EVERY document scores identically (a constant 2.0),
    // so `relevance` degenerates to the `iri` tiebreaker and browse order comes
    // out alphabetical by slug — which is why `bara-hulak-…` used to lead. Browse
    // with no query is a curated shelf, so it sorts by editorial weight; a typed
    // query has real scores, so it sorts by relevance.
    sort: requestedSort && validSorts.has(requestedSort)
      ? requestedSort
      : q
        ? "relevance"
        : "featured",
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
