import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { seriesBySlug } from "@/data/material-series";
import {
  folderTintClass,
  formatArchiveCount,
  formatLedgerDate,
  pickLocalized,
  resolveMaterialDate,
} from "@/lib/materials-landing";
import { archiveStatisticsQuery } from "@/queries/materials-landing";
import {
  cursorFromNextUrl,
  listMaterialsBySource,
  materialTail,
} from "@/services/datalake-api";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

import type { Material } from "@/services/datalake-api";

function materialName(material: Material, language: string): string {
  const name = material.name;
  if (typeof name === "string") return name;
  return pickLocalized(name ?? undefined, language);
}

/**
 * One series of the archive: real count from /api/statistics/, documents from
 * the public per-source list (`/api/materials/?source=…`), newest-ingested
 * first, cursor-paginated behind a "load more".
 *
 * The backend offers no text search, year, type or language filter on this
 * list yet (and the search API cannot filter by source) — until it does, the
 * page links to the archive-wide materials search instead of faking controls.
 */
export default function MaterialSeriesBrowse({ slug }: Readonly<{ slug: string }>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const series = seriesBySlug(slug);

  const { data: statistics } = useQuery({
    ...archiveStatisticsQuery(),
    staleTime: 5 * 60 * 1000,
  });

  const documentsQuery = useInfiniteQuery({
    queryKey: ["materials-by-source", series?.source ?? slug],
    queryFn: ({ pageParam }) =>
      listMaterialsBySource(series?.source ?? "", pageParam || undefined),
    initialPageParam: "",
    getNextPageParam: (page) => cursorFromNextUrl(page.next),
    enabled: Boolean(series),
    staleTime: 5 * 60 * 1000,
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
  const count =
    statistics?.materials?.by_source?.find((row) => row.source === series.source)
      ?.count ?? null;
  const documents = documentsQuery.data?.pages.flatMap((page) => page.results) ?? [];

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

      <header className="mt-8 border-b border-border pb-8">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={`mt-2 h-4 w-4 shrink-0 rounded-full border border-primary/20 ${folderTintClass(series.tint)}`}
          />
          <div>
            <h1 className="font-archive-hero-title">{name}</h1>
            <p className="font-page-lede mt-4 max-w-2xl">
              {pickLocalized(series.description, language)}
            </p>
            <p className="mt-4 font-mono text-sm tabular-nums text-muted-foreground">
              {count === null
                ? "—"
                : t("materialsLanding.series.count", "{{total}} documents in this series", {
                    total: formatArchiveCount(count, language),
                  })}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Button asChild variant="outline" size="sm">
            <Link to="/search?type=material">
              {t("materialsLanding.series.searchAll", "Search all materials")} →
            </Link>
          </Button>
        </div>
      </header>

      <section aria-label={name} className="mt-10">
        {documentsQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!documentsQuery.isLoading && documents.length === 0 && (
          <p className="font-page-lede py-8">
            {t("materialsLanding.series.empty", "No documents are visible in this series right now.")}
          </p>
        )}

        {documents.length > 0 && (
          <ul className="list-none divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-elev-sm">
            {documents.map((material) => {
              const tail = materialTail(material["@id"]);
              const date = resolveMaterialDate({ date: material.datePublished });
              const dateLabel =
                formatLedgerDate(date, language) ||
                t("materialsLanding.series.undated", "Undated");
              return (
                <li key={material["@id"]}>
                  <Link
                    to={`/material/${tail}`}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-4 px-4 py-4 outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent md:px-6"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-2 font-medium text-foreground">
                        {materialName(material, language) ||
                          t("materialsLanding.recent.untitled", "Untitled document")}
                      </span>
                    </span>
                    <span className="whitespace-nowrap font-mono text-sm tabular-nums text-muted-foreground">
                      {dateLabel}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {documentsQuery.hasNextPage && (
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
        )}
      </section>
    </div>
  );
}
