import {
  FormEvent,
  MouseEvent,
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { DidYouMean } from "@/components/search/DidYouMean";
import {
  SearchFilters,
  SearchFiltersSkeleton,
  type SidebarFilterName,
} from "@/components/search/SearchFilters";
import {
  SearchResultCard,
  EntityResultCardSkeleton,
  SearchResultCardSkeleton,
} from "@/components/search/SearchResultCard";
import { SearchFilterBar } from "@/components/search/SearchFilterBar";
import { formatIndianNumber } from "@/utils/number";
import { SearchTabs } from "@/components/search/SearchTabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CaseCardSkeleton } from "@/components/CaseCardSkeleton";
import { CourtCaseCardSkeleton } from "@/components/CourtCaseCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
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
  ArchiveSearchSort,
  ArchiveSearchType,
} from "@/types/search";
import { describeBigoRange, readBigoBounds } from "@/lib/bigo-range";
import {
  describeDateRange,
  readDateBounds,
  type DateBounds,
} from "@/lib/date-range";
import {
  normalizeArchiveSearchParams,
  setArchiveSearchParam,
  toggleArchiveSearchParam,
} from "@/utils/archive-search-params";
import { trackEvent } from "@/utils/analytics";
import { sendSearchClick } from "@/utils/searchClick";
import { Seo } from "@/components/Seo";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

// "bigo" and "date" are refinements for pill/clear purposes only — each is one
// removable range, not a list of facet tokens, so neither joins the `selected`
// record the checkbox groups are driven from.

const validSorts = new Set<ArchiveSearchSort>([
  "relevance",
  "newest",
  "oldest",
  "title",
  "featured",
]);
const archiveSearchPageSize = 12;
// Mirrors MAX_OFFSET_RESULT_WINDOW in the API's search/service.py. Offset paging
// (?page=) is rejected with HTTP 400 once `page * page_size` passes this, because
// OpenSearch will not serve a `from + size` beyond its max_result_window — so the
// reachable page count is bounded by THIS, not by the result count.
//
// At page_size 12 that is page 833, while `count` (578k+ records) implies 48,185.
// The pager used to offer the implied last page and every click on it 400'd.
//
// Raising the API's window means raising this too — they are one constant in two
// repos, and the FE cannot discover the server's value (it is not in the search
// response envelope). If deep paging is ever genuinely needed, the response's
// `next_cursor` is the unbounded path; it is next-only, so it cannot back a
// numbered pager and would need a different affordance.
const archiveSearchMaxOffsetResults = 10_000;
const emptyFacets: ArchiveSearchFacets = {
  entity_type: [],
  case_type: [],
  tags: [],
  status: [],
  court: [],
  court_type: [],
  district: [],
  province: [],
  material_type: [],
};

// The one search page. /cases, /courtcases and /entities redirect here with
// `?type=` set, and /materials sends its old ?q= deep links here too, so the
// record type always comes from the URL.
export default function ArchiveSearch() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRecordType = useMemo(
    () => readRecordType(searchParams),
    [searchParams],
  );
  const params = useMemo(
    () => readParams(searchParams, selectedRecordType),
    [searchParams, selectedRecordType],
  );
  const [query, setQuery] = useState(params.q || "");
  // Results are cards. Materials have one canonical presentation — the
  // full-width document row shared with the /materials series browse (title
  // left, download/source/share actions right) — so they keep it; there is no
  // card/list toggle.
  const effectiveViewMode = selectedRecordType === "material" ? "list" : "card";
  // The "All filters" sheet: every group the tab offers, at once.
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);

  // Follow the URL (back/forward, a chip, a suggestion), but leave the field
  // alone when it already says the same words: the debounced commit trims, and
  // writing that back would eat the space the reader just typed.
  useEffect(() => {
    setQuery((current) => (current.trim() === (params.q || "") ? current : params.q || ""));
  }, [params.q]);
  useEffect(() => {
    const normalized = normalizeArchiveSearchParams(searchParams);
    if (normalized.toString() !== searchParams.toString()) {
      setSearchParams(normalized, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const stressMode = import.meta.env.DEV ? readStressParam(searchParams.get("data")) : null;
  const {
    data,
    isError,
    isFetching,
    isLoading,
    isPlaceholderData,
    refetch,
  } = useQuery({
    queryKey: ["archive-search", params, stressMode],
    queryFn: async () => {
      const response = await searchArchive(params);
      // DEV ONLY: ?data=worst|empty|one swaps in the stress fixture at this
      // boundary. The branch is compiled out of production builds.
      if (import.meta.env.DEV && stressMode) {
        const { applyStress } = await import("@/dev/archive-search-stress");
        return applyStress(stressMode, response);
      }
      return response;
    },
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
  // "2,836 results", grouped the way the rest of the page writes numbers. The
  // locale strings carry the plural; the digits are swapped for the grouped form.
  const resultCount = displayData?.count || 0;
  const resultCountLabel =
    isInitialLoading || isRefreshing || showError
      ? null
      : t("archiveSearch.results", "{{count}} results", { count: resultCount }).replace(
          String(resultCount),
          formatIndianNumber(resultCount),
        );
  // Share metadata. Until 2026-08 this was a title, a description and a
  // canonical, and no og: tags at all: a share rendered as a bare link with no
  // card.
  //
  // The fallbacks come from i18n rather than being hardcoded English, so the
  // <title> matches the <h1> the page actually renders. The previous literals
  // were a third paraphrase of the archive description, alongside the two in
  // en.json and ne.json.
  const pageHeading = t("archiveSearch.heading", "Archive Search");
  const pageDescription = t(
      "archiveSearch.description",
      "Search Jawafdehi's public accountability archive across cases, people, offices, locations, charges, and evidence documents.",
    );

  // Every URL on this site 307s to its trailing-slash form, so the canonical
  // carries one.
  const canonicalUrl = `${SITE_URL}/search/`;

  // A result set is not a landing page. The bare browse view is worth
  // indexing; the same view narrowed by a query or paged past the first is thin, near-duplicate content, and Google's own guidance is
  // to keep internal search results out of the index. `follow` is deliberate —
  // the crawler should still walk through to the records themselves.
  //
  // This is a meta tag and not a robots.txt rule on purpose: a disallowed URL is
  // never fetched, so the crawler would never read the tag that drops it, and
  // /search is listed in sitemap.xml — which robots.txt would then contradict.
  // See the note at the bottom of public/robots.txt.
  const isFilteredResultSet = Boolean(params.q) || params.page > 1;

  const updateParams = (
    updates: Record<string, string | number | undefined>,
    options?: { replace?: boolean },
  ) => {
    let next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([name, value]) => {
      next = setArchiveSearchParam(next, name, value);
    });
    setSearchParams(next, options);
  };

  // Search as you type: once the words have been still for 300ms they become
  // the query. `replace`, so typing a word is one history entry, not one per
  // letter; Enter still commits at once through submitSearch.
  const updateParamsRef = useRef(updateParams);
  updateParamsRef.current = updateParams;
  useEffect(() => {
    const next = query.trim();
    if (next === (params.q ?? "")) return;
    const timer = window.setTimeout(() => {
      updateParamsRef.current({ q: next || undefined, page: 1 }, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, params.q]);

  const updateFilter = (name: string, value?: string) => {
    updateParams({ [name]: value, page: 1 });
  };

  const toggleRefinement = (name: SidebarFilterName, value: string) => {
    setSearchParams(
      toggleArchiveSearchParam(searchParams, name, value),
    );
  };

  // A filter chip's ×: every value of that one group goes in one edit.
  const clearRefinementGroup = (name: SidebarFilterName) => {
    const next = new URLSearchParams(searchParams);
    next.delete(name);
    next.delete("page");
    setSearchParams(next);
  };

  const updateRecordType = (type?: ArchiveSearchType) => {
    let next = setArchiveSearchParam(searchParams, "type", type || "all");
    next = setArchiveSearchParam(next, "page", 1);
    // The "Entity type" facet only renders while browsing Entities, so leaving a
    // stale entity_type behind would silently filter the new record type through
    // a control the user can no longer see.
    if (type !== "entity") next.delete("entity_type");
    // Court facets are scoped like entity_type: keeping them after switching
    // away would narrow a different record type through invisible controls.
    if (type !== "courtcase") {
      (["court", "court_type"] as const).forEach((name) => next.delete(name));
    }
    // District/Province travel between the tabs that share subject geography,
    // and clear on the way to one that has none.
    if (!hasSubjectGeography(type ?? "all")) {
      (["district", "province"] as const).forEach((name) => next.delete(name));
    }
    // Same for the बिगो range, which only renders while browsing Cases. readParams
    // already declines to send a stale bound, but dropping it from the URL keeps
    // what is shared or bookmarked honest about what is actually applied.
    if (type !== "case") {
      next.delete("bigo_min");
      next.delete("bigo_max");
    }
    // Document type and the date range are both material-scoped controls, so
    // they clear on the way out for the same reason.
    if (type !== "material") {
      next.delete("material_type");
      next.delete("date_from");
      next.delete("date_to");
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

  // One request per committed range, and both bounds move as ONE edit — same
  // reasoning as updateBigoRange above: setting them in sequence through
  // setArchiveSearchParam re-normalizes in between, and a new lower bound
  // momentarily above the OUTGOING upper bound reads as inverted at that point,
  // which drops both and loses the half already written.
  const updateDateRange = ({ from, to }: DateBounds) => {
    const next = new URLSearchParams(searchParams);
    next.delete("date_from");
    next.delete("date_to");
    if (from !== undefined) next.set("date_from", from);
    if (to !== undefined) next.set("date_to", to);
    next.delete("page");
    setSearchParams(normalizeArchiveSearchParams(next));
  };

  // Clears the FILTERS, not the tab: the record type is where the reader is,
  // not a refinement of it. Deleting `type` here sent "Clear all" on the Cases
  // tab back to All records.
  const clearRefinements = () => {
    const next = new URLSearchParams(searchParams);
    (
      [
        "entity_type",
        "case_type",
        "tags",
        "court",
        "court_type",
        "district",
        "province",
        "material_type",
        "bigo_min",
        "bigo_max",
        "date_from",
        "date_to",
      ] as const
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
    court: params.court || [],
    court_type: params.court_type || [],
    district: params.district || [],
    province: params.province || [],
    material_type: params.material_type || [],
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
  // The date range gets its own single pill, on the same terms as बिगो: one
  // refinement, one chip, and removing it clears both sides. A preset and a typed
  // range are indistinguishable here by design — the pill states the dates that
  // are actually applied, not the gesture that set them.
  const hasDateRange =
    params.date_from !== undefined || params.date_to !== undefined;
  const datePill = hasDateRange
    ? {
        name: "date" as const,
        value: "date",
        label: describeDateRange(params.date_from, params.date_to, t),
      }
    : null;
  const activeRefinementCount =
    Object.values(selectedRefinements).reduce(
      (count, values) => count + values.length,
      0,
    ) +
    (bigoPill ? 1 : 0) +
    (datePill ? 1 : 0);
  const facets = displayData?.facets || emptyFacets;
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
        dateFrom={params.date_from}
        dateTo={params.date_to}
        onDateCommit={updateDateRange}
        onToggle={toggleRefinement}
        selected={selectedSidebarFilters}
        selectedType={selectedRecordType}
        variant="sheet"
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
        {/*
          The coverage link sits to the RIGHT of the title, not under the
          subtitle. It is a secondary way OUT of this page, and below the subtitle
          it pushed the search bar — the one control everybody comes here for —
          a further ~44px down the fold. `items-start` levels it with the top of
          the heading block; `flex-wrap` drops it under the subtitle, where it
          used to live, once the row no longer fits.
        */}
        <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <div className="max-w-3xl">
            <h1 className="font-home-display mt-3 text-4xl font-medium tracking-[-0.04em] text-primary md:text-[3.25rem]">
              {pageHeading}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-snug text-muted-foreground">
              {t(
                "archiveSearch.description",
                "Search Jawafdehi's public accountability archive across cases, people, offices, locations, allegations, and evidence documents.",
              )}
            </p>
          </div>
          <Link
            className="group mt-5 inline-flex shrink-0 items-center gap-2 text-base text-primary transition-colors hover:text-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
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

        {/*
          The count sits at the right end of the tab row, over the sort it
          answers to. Inside the selected pill it changed the pill's width
          on every click and every load, nudging the tabs after it.
        */}
        <div className="mt-10 flex items-center justify-between gap-6">
          <SearchTabs activeType={selectedRecordType} onChange={updateRecordType} />
          <div
            aria-hidden="true"
            className="hidden shrink-0 whitespace-nowrap text-[15px] tabular-nums text-muted-foreground sm:block"
          >
            {resultCountLabel}
          </div>
        </div>

        {/*
          The search bar and the filters are ONE sticky header. They are used
          together — a reader refines the words and the filters in turn — so
          they pin together under the navbar (76px) rather than the filters
          staying put while the search bar scrolls away.
        */}
        <div className="sticky top-[76px] z-30 -mx-4 mt-3 bg-background px-4 py-3 sm:mx-0 sm:px-0">
          <form
            className="flex flex-col gap-3 xl:flex-row xl:items-center"
            onSubmit={submitSearch}
          >
            <label className="sr-only" htmlFor="archive-search">
              {t("archiveSearch.searchLabel", "Search the Jawafdehi archive")}
            </label>
            <SearchBar
              className="xl:w-[420px] xl:flex-none"
              clearLabel={t("archiveSearch.clear", "Clear search")}
              enterKeyHint="search"
              id="archive-search"
              // White on a hairline, against the grey chips: the one place
              // you type, so it is the one control that is not a pill of grey.
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => {
                setQuery("");
                updateParams({ q: undefined, page: 1 });
              }}
              // Names what THIS tab searches ("Search cases", "Search
              // documents"), so the field says where the words will go.
              placeholder={t(
                `archiveSearch.placeholders.${selectedRecordType}`,
                PLACEHOLDER_FALLBACK[selectedRecordType],
              )}
              showSubmit={false}
              value={query}
            />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {showFilters ? (
                <SearchFilterBar
                  activeCount={activeRefinementCount}
                  bigoExtent={displayData?.extents?.bigo}
                  bigoLabel={bigoPill?.label}
                  bigoMax={params.bigo_max}
                  bigoMin={params.bigo_min}
                  className="min-w-0 flex-1"
                  dateFrom={params.date_from}
                  dateLabel={datePill?.label}
                  dateTo={params.date_to}
                  facets={facets}
                  onBigoCommit={updateBigoRange}
                  onClearGroup={clearRefinementGroup}
                  onDateCommit={updateDateRange}
                  onOpenAll={() => setAllFiltersOpen(true)}
                  onToggle={toggleRefinement}
                  selected={selectedSidebarFilters}
                  selectedType={selectedRecordType}
                />
              ) : (
                <div className="flex-1" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <div
                aria-live="polite"
                // The count is shown at the end of the tab row; this copy stays
                // the live region, and the visible one on phones, where that
                // row has no room for it.
                className="mr-auto flex min-h-5 items-center whitespace-nowrap text-sm tabular-nums text-muted-foreground xl:mr-0 sm:sr-only"
              >
                {isInitialLoading || isRefreshing ? (
                  <>
                    <span className="sr-only">
                      {t("archiveSearch.searching", "Searching archive")}
                    </span>
                    <Skeleton aria-hidden="true" className="h-4 w-20" />
                  </>
                ) : (
                  resultCountLabel
                )}
              </div>
              <label className="sr-only" htmlFor="archive-sort">
                {t("archiveSearch.sort", "Sort")}
              </label>
              <Select onValueChange={(sort) => updateFilter("sort", sort)} value={params.sort}>
                <SelectTrigger
                  className="ml-auto h-10 w-[190px] gap-2 rounded-full border-transparent bg-muted px-4 text-[15px] shadow-none hover:bg-primary/[0.08]"
                  id="archive-sort"
                >
                  <span aria-hidden="true" className="text-muted-foreground">
                    {t("archiveSearch.sort", "Sort")}
                  </span>
                  <span className="mr-auto min-w-0 truncate text-primary">
                    <SelectValue />
                  </span>
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
        </div>

        {StressToggle ? (
          <Suspense fallback={null}>
            <StressToggle />
          </Suspense>
        ) : null}

        <Sheet onOpenChange={setAllFiltersOpen} open={allFiltersOpen}>
          <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md" side="right">
            <SheetHeader className="space-y-0 px-7 pb-0 pt-6 text-left">
              <SheetTitle className="text-2xl font-medium tracking-[-0.02em] text-primary">
                {t("archiveSearch.allFilters", "All filters")}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-7 pb-6 pt-5">{searchFilters}</div>
            {/* Two equal pills, the pattern Fresha and H&M use: a quiet Clear
                all beside the solid action. The filters already apply as you
                tick them, so the action only closes the sheet. It carries no
                count: the page already shows one at the end of the tab row. */}
            <div className="grid grid-cols-2 gap-3 px-7 py-5">
              <Button
                className="h-12 rounded-full bg-muted text-[15px] font-normal text-primary shadow-none hover:bg-primary/[0.08] disabled:text-muted-foreground"
                disabled={activeRefinementCount === 0}
                onClick={() => {
                  // Clearing is the end of the job: close the sheet so the
                  // reader lands back on the unfiltered results.
                  clearRefinements();
                  setAllFiltersOpen(false);
                }}
                type="button"
                variant="ghost"
              >
                {t("archiveSearch.clearAll", "Clear all")}
              </Button>
              <Button
                className="h-12 rounded-full text-[15px] font-medium"
                onClick={() => setAllFiltersOpen(false)}
                variant="primary"
              >
                {t("archiveSearch.viewResults", "View results")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="mt-4">
          <section
            aria-busy={isInitialLoading || isRefreshing}
            aria-label="Archive search results"
            className="min-w-0"
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

            {/* Gated on a settled response: showing a suggestion derived from the
                PREVIOUS query while the next one is still in flight would offer a
                correction for a term the reader has already moved on from. */}
            {!showError && !isFetching && !isPlaceholderData && data?.did_you_mean ? (
              <DidYouMean
                onAccept={(suggestion) => {
                  // `query` is local state seeded from the URL only on mount, so
                  // updating the params alone would leave the misspelling sitting
                  // in the search box while the results below it changed.
                  setQuery(suggestion);
                  updateParams({ page: 1, q: suggestion });
                }}
                suggestion={data.did_you_mean}
              />
            ) : null}

            <ArchiveSearchResults
              data={displayData}
              isError={showError}
              isLoading={isInitialLoading || isRefreshing}
              resultType={selectedRecordType}
              searchTerm={params.q}
              viewMode={effectiveViewMode}
            />

            {!showError &&
            !isFetching &&
            !isPlaceholderData &&
            data &&
            data.count > data.page_size ? (
              <PaginationControls
                maxPages={Math.floor(
                  archiveSearchMaxOffsetResults / Math.max(1, data.page_size),
                )}
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

/** The tabs whose records carry a district and province. */
function hasSubjectGeography(type: ArchiveSearchType) {
  return type === "courtcase" || type === "case" || type === "entity";
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

// The URL's date bounds. Already the API's param names, so this only applies the
// rules — but it stays a named helper so the readParams spread reads the same as
// the बिगो one above.
function readDateParams(searchParams: URLSearchParams) {
  const { from, to } = readDateBounds(searchParams);
  return { date_from: from, date_to: to };
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
    // These dimensions describe court records, not ordinary Jawafdehi cases.
    // Ignore stale hand-authored/bookmarked values on other tabs so the result
    // set can never be narrowed by a control the reader cannot see.
    court:
      selectedRecordType === "courtcase" ? searchParams.getAll("court") : [],
    court_type:
      selectedRecordType === "courtcase"
        ? searchParams.getAll("court_type")
        : [],
    // District and Province carry SUBJECT geography, which court cases,
    // Jawafdehi cases and entities all populate, so they apply on exactly the
    // tabs that show the control (filterGroupsFor). Reading them only on Court
    // cases ignored a ticked province on the Cases tab while the control showed
    // it as applied.
    district: hasSubjectGeography(selectedRecordType)
      ? searchParams.getAll("district")
      : [],
    province: hasSubjectGeography(selectedRecordType)
      ? searchParams.getAll("province")
      : [],
    // Document type is material-scoped and CLOSED on the API side, so a stale
    // token is not merely a filter through an invisible control — it is a 400,
    // which this page renders as the red "could not be loaded" alert. Gating it
    // here means switching tabs cannot turn a bookmark into what reads as an
    // outage. (updateRecordType also strips it from the URL; this is the guard
    // for a hand-authored one that never went through a tab switch.)
    material_type:
      selectedRecordType === "material"
        ? searchParams.getAll("material_type")
        : [],
    case_type: searchParams.getAll("case_type"),
    tags: searchParams.getAll("tags"),
    // Date bounds, gated to the tab that renders the control. Read through
    // readDateParams for the same reason as the बिगो pair below: an inverted
    // range parses fine bound-by-bound, and normalization only heals the URL an
    // effect later — by which point this render has already sent the 400.
    ...(selectedRecordType === "material"
      ? readDateParams(searchParams)
      : { date_from: undefined, date_to: undefined }),
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

// Three across from `xl`, not `2xl`. The third column used to arrive only at
// 1536px, so every laptop sat in a two-up band that stretched from 640px all
// the way up, leaving cards 459-519px wide with ~200px of content in them.
// `lg` is too early on this page specifically: unlike /cases, the results share
// the row with a 250px filter sidebar, so three columns there would be ~235px
// each. At `xl` they are ~299px and by 1440px ~339px, which is the width
// /cases already runs the same CaseCard at (3-up from `lg`, full-bleed).
// Three across at most. Four squeezed a case card to ~320px: titles broke after
// two words and every metadata line ended in an ellipsis.
const cardGridClass = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
// Entity hits are compact avatar cards (see EntityResultCard), so a page of them
// sits four across where the richer case cards need three.
const PLACEHOLDER_FALLBACK: Record<ArchiveSearchType, string> = {
  all: "Search the archive",
  case: "Search cases",
  entity: "Search people, offices and places",
  material: "Search documents",
  courtcase: "Search court cases by name or number",
};

// DEV ONLY: the worst-case data switch (see src/dev/archive-search-stress.ts).
// Lazy and gated, so neither the switch nor the fixture reaches production.
const StressToggle = import.meta.env.DEV ? lazy(() => import("@/dev/StressToggle")) : null;
function readStressParam(value: string | null) {
  return value === "worst" || value === "empty" || value === "one" ? value : null;
}

const listGridClass = "grid grid-cols-1 gap-3 lg:grid-cols-2";
const entityCardGridClass = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function ArchiveSearchResults({
  data,
  isError,
  isLoading,
  resultType,
  searchTerm,
  viewMode,
}: Readonly<{
  data: ArchiveSearchResponse | undefined;
  isError: boolean;
  isLoading: boolean;
  resultType: ArchiveSearchType;
  searchTerm?: string;
  viewMode: "list" | "card";
}>) {
  const { t } = useTranslation();
  const searchingLabel = t("archiveSearch.searching", "Searching archive");
  if (isLoading) {
    if (viewMode === "card") {
      return (
        // Each tab loads in its own card's shape: entities are the small
        // four-across avatar cards, court cases their outlined card, and Cases
        // and All the case card with its banner.
        <output aria-label={searchingLabel} className={resultType === "entity" ? entityCardGridClass : cardGridClass}>
          {Array.from({ length: archiveSearchPageSize }, (_, index) =>
            resultType === "courtcase" ? (
              <CourtCaseCardSkeleton key={index} />
            ) : resultType === "entity" ? (
              <EntityResultCardSkeleton key={index} />
            ) : (
              <CaseCardSkeleton key={index} />
            ),
          )}
        </output>
      );
    }
    if (resultType === "courtcase") {
      return (
        <div aria-label={searchingLabel} className="space-y-3" role="status">
          {Array.from({ length: archiveSearchPageSize }, (_, index) => (
            <CourtCaseCardSkeleton key={index} viewMode="list" />
          ))}
        </div>
      );
    }
    return (
      <div
        aria-label={searchingLabel}
        aria-live="polite"
        className={listGridClass}
        role="status"
      >
        {Array.from({ length: archiveSearchPageSize }, (_, index) => (
          <SearchResultCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) return null;

  if (!data?.results.length) {
    return (
      <EmptyState
        kind="noResults"
        title={t("archiveSearch.empty.title", "No archive records found")}
        description={t("archiveSearch.empty.line", "Try a broader term or remove one of the filters.")}
      />
    );
  }

  // 1-based rank across the whole result set (accounts for the current page),
  // sent with each result click so we can measure rank-of-first-click.
  const rankOf = (index: number) => (data.page - 1) * data.page_size + index + 1;

  if (viewMode === "card") {
    return (
      <div className={resultType === "entity" ? entityCardGridClass : cardGridClass}>
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

  // Materials, the one list-shaped result. Two columns once the page is wide
  // enough: a document row stretched across 1,300px leaves its title on the
  // left and a field of white to the right.
  return (
    <div className={listGridClass}>
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
    <div className="h-full" onClick={handleClick}>
      {children}
    </div>
  );
}

