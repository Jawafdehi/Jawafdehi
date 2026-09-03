import { useInfiniteQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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
import { seriesBySlug } from "@/data/material-series";
import {
  formatArchiveCount,
  pickLocalized,
  resolveMaterialDate,
} from "@/lib/materials-landing";
import {
  cursorFromNextUrl,
  listMaterialsBySource,
} from "@/services/datalake-api";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

import type { Material } from "@/services/datalake-api";

type MaterialSortOrder = "latest" | "oldest";

const EMPTY_FILTERS: MaterialFilters = {
  preset: "all",
  startDate: "",
  endDate: "",
  query: "",
};

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function presetStartDate(preset: MaterialDatePreset): string {
  if (preset === "all" || preset === "custom") return "";
  const start = new Date();
  if (preset === "30-days") start.setDate(start.getDate() - 30);
  if (preset === "6-months") start.setMonth(start.getMonth() - 6);
  if (preset === "1-year") start.setFullYear(start.getFullYear() - 1);
  return localIsoDate(start);
}

function searchableMaterialText(material: Material): string {
  const bilingual = (value: Material["name"] | Material["description"]): string => {
    if (typeof value === "string") return value;
    return `${value?.ne ?? ""} ${value?.en ?? ""}`;
  };
  return [
    bilingual(material.name),
    bilingual(material.description),
    material.identifier,
    typeof material.additionalType === "string" ? material.additionalType : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

/**
 * One series of the archive: documents from the public per-source list
 * (`/api/materials/?source=…`), newest-ingested first and cursor-paginated
 * behind a "load more".
 *
 * The backend offers no date or text filters on this source list yet. The
 * sidebar therefore filters the cursor pages already loaded in the browser,
 * labels that scope plainly, and keeps "load more" available to expand it.
 */
export default function MaterialSeriesBrowse({ slug }: Readonly<{ slug: string }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const series = seriesBySlug(slug);

  const documentsQuery = useInfiniteQuery({
    queryKey: ["materials-by-source", series?.source ?? slug],
    queryFn: ({ pageParam }) =>
      listMaterialsBySource(series?.source ?? "", pageParam || undefined),
    initialPageParam: "",
    getNextPageParam: (page) => cursorFromNextUrl(page.next),
    enabled: Boolean(series),
    staleTime: 5 * 60 * 1000,
  });

  const [filters, setFilters] = useState<MaterialFilters>(EMPTY_FILTERS);
  const [sortOrder, setSortOrder] = useState<MaterialSortOrder>("latest");
  const deferredQuery = useDeferredValue(filters.query.trim().toLocaleLowerCase());
  const documents = useMemo(
    () => documentsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [documentsQuery.data],
  );
  const invalidDateRange = Boolean(
    filters.startDate && filters.endDate && filters.startDate > filters.endDate,
  );
  // Each document's AD date is resolved ONCE per page load, not per comparison:
  // resolveMaterialDate runs a bikram-sambat conversion, and a comparator that
  // called it would run two of them per compare — O(n log n) conversions over a
  // list that grows with every "load more".
  const datedDocuments = useMemo(
    () =>
      documents.map((material) => ({
        material,
        ad: resolveMaterialDate({ date: material.datePublished || material.dateCreated }).ad,
      })),
    [documents],
  );
  const filteredDocuments = useMemo(() => {
    if (invalidDateRange) return [];
    const startDate = filters.startDate || presetStartDate(filters.preset);
    const endDate = filters.endDate;

    return datedDocuments
      .filter(({ material, ad }) => {
        if (deferredQuery && !searchableMaterialText(material).includes(deferredQuery)) {
          return false;
        }
        if (!startDate && !endDate) return true;
        if (!ad) return false;
        if (startDate && ad < startDate) return false;
        if (endDate && ad > endDate) return false;
        return true;
      })
      .sort((a, b) => {
        if (!a.ad && !b.ad) return 0;
        if (!a.ad) return 1;
        if (!b.ad) return -1;
        return sortOrder === "latest"
          ? b.ad.localeCompare(a.ad)
          : a.ad.localeCompare(b.ad);
      })
      .map(({ material }) => material);
  }, [
    datedDocuments,
    deferredQuery,
    filters.endDate,
    filters.preset,
    filters.startDate,
    invalidDateRange,
    sortOrder,
  ]);
  const activeDateFilterCount =
    filters.preset !== "all" || filters.startDate || filters.endDate ? 1 : 0;

  const changePreset = (preset: MaterialDatePreset) => {
    setFilters((current) => ({ ...current, preset, startDate: "", endDate: "" }));
  };
  const changeStartDate = (startDate: string) => {
    setFilters((current) => ({ ...current, preset: "custom", startDate }));
  };
  const changeEndDate = (endDate: string) => {
    setFilters((current) => ({ ...current, preset: "custom", endDate }));
  };
  const changeQuery = (query: string) => {
    setFilters((current) => ({ ...current, query }));
  };
  const clearDateFilters = () => {
    setFilters((current) => ({ ...current, preset: "all", startDate: "", endDate: "" }));
  };
  const clearAllFilters = () => setFilters(EMPTY_FILTERS);

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
        <form role="search" onSubmit={(event) => event.preventDefault()}>
          <SearchBar
            type="search"
            value={filters.query}
            onChange={(event) => changeQuery(event.target.value)}
            placeholder={t(
              "materialsLanding.series.searchPlaceholder",
              "Search inside this series…",
            )}
            submitLabel={t("materialsLanding.series.searchSubmit", "Search this series")}
            inputClassName="bg-surface shadow-elev-xs"
          />
        </form>
        <p className="whitespace-nowrap text-sm text-muted-foreground">
          {t("materialsLanding.series.showingLoaded", "Showing {{shown}} of {{loaded}} loaded", {
            shown: formatArchiveCount(filteredDocuments.length, language),
            loaded: formatArchiveCount(documents.length, language),
          })}
        </p>
        <div className="flex items-center gap-3 md:justify-end">
          <span className="text-sm font-medium text-muted-foreground">
            {t("materialsLanding.series.sortLabel", "Sort")}
          </span>
          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as MaterialSortOrder)}
          >
            <SelectTrigger
              aria-label={t("materialsLanding.series.sortLabel", "Sort")}
              className="h-12 min-w-40 rounded-full bg-surface px-4 shadow-elev-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">
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
                {t("materialsLanding.filters.description", "Filter the loaded documents")}
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
                {t("materialsLanding.series.empty", "No documents are visible in this series right now.")}
              </p>
            </div>
          ) : null}

          {!documentsQuery.isLoading && documents.length > 0 && filteredDocuments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/50 px-6 py-12 text-center">
              <p className="font-page-lede">
                {t("materialsLanding.filters.noMatches", "No loaded documents match these filters.")}
              </p>
              <Button variant="outline" className="mt-5" onClick={clearAllFilters}>
                {t("materialsLanding.filters.clear", "Clear filters")}
              </Button>
            </div>
          ) : null}

          {filteredDocuments.length > 0 ? (
            <ul className="list-none space-y-3">
              {filteredDocuments.map((material) => (
                <MaterialListCard
                  key={material["@id"]}
                  material={material}
                  series={series}
                />
              ))}
            </ul>
          ) : null}

          {documentsQuery.hasNextPage ? (
            <div className="mt-8 flex flex-col items-center gap-2">
              <Button
                variant="outline"
                onClick={() => documentsQuery.fetchNextPage()}
                disabled={documentsQuery.isFetchingNextPage}
              >
                {documentsQuery.isFetchingNextPage
                  ? t("materialsLanding.series.loading", "Loading…")
                  : t("materialsLanding.series.loadMore", "Load more")}
              </Button>
              {activeDateFilterCount || filters.query.trim() ? (
                <p className="text-center text-xs text-muted-foreground">
                  {t("materialsLanding.filters.loadMoreHint", "Load more documents to extend the filtered results.")}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
