import { useInfiniteQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import Seo from "@/components/Seo";
import { MaterialListCard } from "@/components/materials/MaterialListCard";
import {
  MaterialFilterPanel,
  type MaterialDatePreset,
  type MaterialFilters,
} from "@/components/materials/MaterialFilterPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchBar } from "@/components/ui/search-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { seriesBySlug, seriesScope } from "@/data/material-series";
import { formatArchiveCount, pickLocalized } from "@/lib/materials-landing";
import { searchArchive } from "@/services/search-api";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

import type { Material } from "@/services/datalake-api";
import type { ArchiveSearchResult } from "@/types/search";

type MaterialSortOrder = "newest" | "oldest";

const PAGE_SIZE = 50;

/** URL params this view owns. Everything else on the query string is left alone. */
const PARAM = {
  query: "q",
  sort: "sort",
  preset: "when",
  start: "from",
  end: "to",
} as const;

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const PRESETS: readonly MaterialDatePreset[] = [
  "all",
  "30-days",
  "6-months",
  "1-year",
  "custom",
];

/**
 * Read a preset off the query string, falling back to "all".
 *
 * These values are URL-supplied now, so they are untrusted in a way they were
 * not while the control lived in component state. An unrecognised one must NOT
 * reach `presetStartDate`: it matches none of the branches there and returns
 * TODAY, which silently filters the series down to nothing with no indication
 * that the URL was the cause.
 */
function readPreset(raw: string | null): MaterialDatePreset {
  return PRESETS.includes(raw as MaterialDatePreset)
    ? (raw as MaterialDatePreset)
    : "all";
}

/**
 * `YYYY-MM-DD`, the only shape the API's date bounds accept — anything else is
 * dropped rather than forwarded, since a malformed bound 400s the request and the
 * reader would see an unexplained empty page.
 *
 * The round-trip is doing real work: the pattern alone accepts `2024-13-99` and
 * `2023-02-29`, which are well-formed and not dates. Re-serializing the parsed
 * value and requiring it to equal the input rejects both.
 */
function readIsoDate(raw: string | null): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10) === raw ? raw : "";
}

function presetStartDate(preset: MaterialDatePreset): string {
  if (preset === "all" || preset === "custom") return "";
  const start = new Date();
  if (preset === "30-days") start.setDate(start.getDate() - 30);
  if (preset === "6-months") start.setMonth(start.getMonth() - 6);
  if (preset === "1-year") start.setFullYear(start.getFullYear() - 1);
  return localIsoDate(start);
}

/**
 * A search hit rendered through the existing material card.
 *
 * The index carries the title and the Gregorian date, which is everything the
 * card's header and meta line need; the rest of the JSON-LD stays on the
 * material's own page. Written as an adapter rather than by teaching the card a
 * second shape, so the series browse and the archive landing keep rendering the
 * identical component.
 */
function hitAsMaterial(hit: ArchiveSearchResult): Material {
  return {
    "@id": hit.id,
    name: { ne: hit.title.ne ?? undefined, en: hit.title.en ?? undefined },
    datePublished: hit.extra?.date,
  } as Material;
}

/**
 * One series of the archive: a scoped search over `/api/search/`, restricted to
 * the series' data-lake source token.
 *
 * This used to page `/api/materials/?source=…` and then search, filter and sort
 * IN THE BROWSER over whatever had been fetched — so every control silently meant
 * "of the ~50 documents loaded so far", and the list arrived in ingest order
 * rather than by date. Both are now the server's job: the search API scopes to one
 * source, orders by the indexed date (undated records last) and reports the true
 * total.
 *
 * The controls live in the URL, so a filtered view is a link someone can send.
 */
export default function MaterialSeriesBrowse({ slug }: Readonly<{ slug: string }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const series = seriesBySlug(slug);
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get(PARAM.query) ?? "";
  const sortOrder: MaterialSortOrder =
    searchParams.get(PARAM.sort) === "oldest" ? "oldest" : "newest";
  const filters: MaterialFilters = {
    preset: readPreset(searchParams.get(PARAM.preset)),
    startDate: readIsoDate(searchParams.get(PARAM.start)),
    endDate: readIsoDate(searchParams.get(PARAM.end)),
    query,
  };

  const invalidDateRange = Boolean(
    filters.startDate && filters.endDate && filters.startDate > filters.endDate,
  );
  const dateFrom = filters.startDate || presetStartDate(filters.preset);
  const dateTo = filters.endDate;

  /** Replace (never push) so filtering does not bury the back button. */
  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  const documentsQuery = useInfiniteQuery({
    queryKey: [
      "material-series-search",
      // The SLUG, not the source: several shelves share one source token now
      // (the five Auditor General ones all scope `official_report`), so keying
      // on the source would serve the annual-report page's results on the
      // audit-journal page from cache.
      slug,
      query,
      sortOrder,
      dateFrom,
      dateTo,
    ],
    queryFn: ({ pageParam }) =>
      searchArchive({
        q: query,
        type: "material",
        ...(series ? seriesScope(series) : { source: [""] }),
        sort: sortOrder,
        page: pageParam,
        page_size: PAGE_SIZE,
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.flatMap((page) => page.results).length < last.count
        ? pages.length + 1
        : undefined,
    enabled: Boolean(series) && !invalidDateRange,
    staleTime: 5 * 60 * 1000,
  });

  const documents = useMemo(
    () => documentsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [documentsQuery.data],
  );
  // The true corpus total, not "how many have been fetched" — the old label
  // counted the latter and called it the former.
  const total = documentsQuery.data?.pages[0]?.count ?? 0;
  const activeDateFilterCount =
    filters.preset !== "all" || filters.startDate || filters.endDate ? 1 : 0;

  const changePreset = (preset: MaterialDatePreset) =>
    updateParams({
      [PARAM.preset]: preset === "all" ? "" : preset,
      [PARAM.start]: "",
      [PARAM.end]: "",
    });
  const changeStartDate = (startDate: string) =>
    updateParams({ [PARAM.preset]: "custom", [PARAM.start]: startDate });
  const changeEndDate = (endDate: string) =>
    updateParams({ [PARAM.preset]: "custom", [PARAM.end]: endDate });
  const changeQuery = (value: string) => updateParams({ [PARAM.query]: value });
  const clearDateFilters = () =>
    updateParams({ [PARAM.preset]: "", [PARAM.start]: "", [PARAM.end]: "" });
  const clearAllFilters = () =>
    updateParams({
      [PARAM.query]: "",
      [PARAM.preset]: "",
      [PARAM.start]: "",
      [PARAM.end]: "",
    });

  if (!series) {
    return (
      <div className="layout-container py-24">
        <Seo
          title={`${t("materialsPage.heading", "Documents & other materials")} | ${SITE_NAME}`}
          description={t("materialsPage.description", "")}
          canonicalUrl={`${SITE_URL}/materials/`}
          language={language}
          robots="noindex, follow"
        />
        <p className="font-page-lede">
          {t("materialsLanding.series.unknown", "This series does not exist. Browse the archive instead:")}
        </p>
        <Button asChild className="mt-6">
          <Link to="/materials/">
            {t("materialsLanding.series.backToArchive", "Back to the archive")}
          </Link>
        </Button>
      </div>
    );
  }

  const name = pickLocalized(series.name, language);
  return (
    <div className="layout-container py-12 md:py-16">
      <Seo
        title={`${name} — ${t("materialsPage.heading", "Documents & other materials")} | ${SITE_NAME}`}
        description={pickLocalized(series.description, language)}
        canonicalUrl={`${SITE_URL}/materials/?series=${series.slug}`}
        language={language}
        robots="noindex, follow"
      />

      <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
        <Link
          to="/materials/"
          className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
        >
          ← {t("materialsLanding.series.backToArchive", "Back to the archive")}
        </Link>
      </nav>

      <header className="mt-8">
        <h1 className="font-archive-hero-title">{name}</h1>
        <p className="font-page-lede mt-4 max-w-2xl">
          {pickLocalized(series.description, language)}
        </p>
      </header>

      <div className="mt-8 grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const input = new FormData(event.currentTarget).get(PARAM.query);
            changeQuery(typeof input === "string" ? input : "");
          }}
        >
          <SearchBar
            type="search"
            name={PARAM.query}
            defaultValue={query}
            key={query}
            placeholder={t(
              "materialsLanding.series.searchPlaceholder",
              "Search inside this series…",
            )}
            submitLabel={t("materialsLanding.series.searchSubmit", "Search this series")}
            inputClassName="bg-surface shadow-elev-xs"
          />
        </form>
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {t("materialsLanding.series.showingTotal", "{{shown}} of {{total}}", {
            shown: formatArchiveCount(documents.length, language),
            total: formatArchiveCount(total, language),
          })}
        </p>
        <div className="flex items-center gap-3 md:justify-end">
          <span className="text-sm font-medium text-muted-foreground">
            {t("materialsLanding.series.sortLabel", "Sort")}
          </span>
          <Select
            value={sortOrder}
            onValueChange={(value) => updateParams({ [PARAM.sort]: value })}
          >
            <SelectTrigger
              aria-label={t("materialsLanding.series.sortLabel", "Sort")}
              className="h-12 min-w-40 rounded-full bg-surface px-4 shadow-elev-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                {t("materialsLanding.series.sortLatest", "Latest first")}
              </SelectItem>
              <SelectItem value="oldest">
                {t("materialsLanding.series.sortOldest", "Oldest first")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 flex justify-end lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter aria-hidden="true" className="h-4 w-4" />
              {t("materialsLanding.filters.title", "Filter")}
              {activeDateFilterCount ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">
                  {activeDateFilterCount}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[92vw] max-w-sm p-0 sm:max-w-sm">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("materialsLanding.filters.title", "Filter")}</SheetTitle>
              <SheetDescription>
                {t("materialsLanding.filters.description", "Filter the documents")}
              </SheetDescription>
            </SheetHeader>
            <MaterialFilterPanel
              filters={filters}
              invalidDateRange={invalidDateRange}
              activeFilterCount={activeDateFilterCount}
              onPresetChange={changePreset}
              onStartDateChange={changeStartDate}
              onEndDateChange={changeEndDate}
              onClear={clearDateFilters}
              idPrefix="materials-filter-mobile"
              className="rounded-none border-0 shadow-none [&>div:first-child]:pr-14"
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:mt-10 lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)] xl:gap-10">
        <aside
          className="sticky top-24 hidden lg:block"
          aria-label={t("materialsLanding.filters.title", "Filter")}
        >
          <MaterialFilterPanel
            filters={filters}
            invalidDateRange={invalidDateRange}
            activeFilterCount={activeDateFilterCount}
            onPresetChange={changePreset}
            onStartDateChange={changeStartDate}
            onEndDateChange={changeEndDate}
            onClear={clearDateFilters}
            idPrefix="materials-filter-desktop"
          />
        </aside>

        <section aria-label={name} className="min-w-0">
          {documentsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Card
                  key={index}
                  className="flex items-center justify-between gap-6 rounded-xl border-0 bg-surface p-5 shadow-elev-md"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-2/5" />
                  </div>
                  <Skeleton className="hidden h-9 w-48 md:block" />
                </Card>
              ))}
            </div>
          ) : null}

          {!documentsQuery.isLoading && documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/50 px-6 py-12 text-center">
              <p className="font-page-lede">
                {query || activeDateFilterCount
                  ? t("materialsLanding.filters.noMatches", "No documents match these filters.")
                  : t("materialsLanding.series.empty", "No documents are visible in this series right now.")}
              </p>
              {query || activeDateFilterCount ? (
                <Button variant="outline" className="mt-5" onClick={clearAllFilters}>
                  {t("materialsLanding.filters.clear", "Clear filters")}
                </Button>
              ) : null}
            </div>
          ) : null}

          {documents.length > 0 ? (
            <ul className="list-none space-y-3">
              {documents.map((hit) => (
                <MaterialListCard
                  key={hit.id}
                  material={hitAsMaterial(hit)}
                  series={series}
                />
              ))}
            </ul>
          ) : null}

          {documentsQuery.hasNextPage ? (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => documentsQuery.fetchNextPage()}
                disabled={documentsQuery.isFetchingNextPage}
              >
                {documentsQuery.isFetchingNextPage
                  ? t("materialsLanding.series.loading", "Loading…")
                  : t("materialsLanding.series.loadMore", "Load more")}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
