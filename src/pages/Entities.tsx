import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import EntityCard from "@/components/EntityCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter } from "lucide-react";
import { getEntities } from "@/services/api";
import { jsonLdToEntity } from "@/services/entity-adapters";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import type { Entity } from "@/services/api";
import type { JawafEntity } from "@/types/jds";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface EnrichedEntity {
  jawafEntity: JawafEntity;
  nesEntity?: Entity;
}

// Raw JSON-LD list item as returned by GET /api/entities. The directory renders
// the entity registry directly (no case linkage), so we synthesize a lightweight
// JawafEntity stub from each doc for EntityCard, plus the adapted Entity for rich
// display. `[k]` keeps the type-specific long tail intact for jsonLdToEntity.
interface EntityJsonLdItem {
  "@id": string;
  "@type"?: string | string[];
  name?: { en?: string; ne?: string } | string;
  [k: string]: unknown;
}

const PAGE_SIZE = 30;

function displayNameFromJsonLd(name: EntityJsonLdItem["name"], lang: string): string {
  if (!name) return "";
  if (typeof name === "string") return name;
  return (lang === "ne" ? name.ne : name.en) || name.en || name.ne || "";
}

const Entities = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Reset to page 1 whenever the (debounced) search changes, and reflect it in the URL.
  useEffect(() => {
    setPage(1);
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    setSearchParams(params, { replace: true });
  }, [debouncedSearchQuery, setSearchParams]);

  const { data, isLoading: loading, isError, isPlaceholderData } = useQuery({
    // `search` is in the key so a query change starts a fresh result set (page 1)
    // and page transitions never mix results across different searches.
    queryKey: ['entities', debouncedSearchQuery, page],
    queryFn: async () => {
      // The entity registry endpoint is GET /api/entities (NO trailing slash — the
      // slash 404s) and paginates with limit/offset, returning
      // { entities: JSON-LD[], total, limit, offset } — NOT { results, next, count }.
      // Search is done SERVER-SIDE (query param) so it spans all ~182k entities, not
      // only the pages loaded so far. Reusing getEntities() keeps the contract in one place.
      const response = await getEntities({
        query: debouncedSearchQuery || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      const items = (response.entities || []) as unknown as EntityJsonLdItem[];
      const total = response.total ?? 0;

      // Each JSON-LD doc IS the entity. Adapt it to the SPA Entity shape for rich
      // display, and synthesize a JawafEntity stub (nes_id/display_name) so
      // EntityCard renders a name + a working /entity/<prefix>/<slug> link.
      const enriched: EnrichedEntity[] = items.map((doc) => {
        const iri = doc["@id"];
        return {
          jawafEntity: {
            nes_id: iri,
            display_name: displayNameFromJsonLd(doc.name, i18n.language),
          } as unknown as JawafEntity,
          nesEntity: jsonLdToEntity(doc),
        };
      });

      return {
        entities: enriched,
        count: total,
        hasMore: (page - 1) * PAGE_SIZE + items.length < total,
      };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Accumulate pages client-side. Guard on !isPlaceholderData so we only append
  // once the NEW page has actually loaded — otherwise the placeholder (previous
  // page's data) would be appended when `page` bumps, duplicating rows.
  const [allEntities, setAllEntities] = useState<EnrichedEntity[]>([]);
  useEffect(() => {
    if (!data || isPlaceholderData) return;
    setAllEntities(prev => page === 1 ? data.entities : [...prev, ...data.entities]);
  }, [data, page, isPlaceholderData]);

  useEffect(() => {
    if (isError) toast.error(t("entities.fetchError") || "Failed to load entities");
  }, [isError, t]);

  // Search is applied server-side (see the query above), so `allEntities` already
  // holds only matching rows. We do NOT re-filter client-side — that would hide
  // valid backend matches whose display_name differs from the raw query. When
  // browsing (no search) we sort by name for a stable, scannable order.
  const filteredEntities = debouncedSearchQuery
    ? allEntities
    : [...allEntities].sort((a, b) => {
        const nameA = a.jawafEntity.display_name || a.jawafEntity.nes_id || '';
        const nameB = b.jawafEntity.display_name || b.jawafEntity.nes_id || '';
        return nameA.localeCompare(nameB);
      });

  const handleReset = () => {
    setSearchQuery("");
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Public Entities | Jawafdehi Nepal</title>
        <meta name="description" content="Explore profiles of Nepali public officials, politicians, and organizations tracked on Jawafdehi. View their associated corruption and misconduct cases." />
        <link rel="canonical" href="https://jawafdehi.org/entities" />
        <meta property="og:site_name" content="Jawafdehi Nepal" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://jawafdehi.org/entities" />
        <meta property="og:title" content="Public Entities | Jawafdehi Nepal" />
        <meta property="og:description" content="Explore profiles of Nepali public officials, politicians, and organizations tracked on Jawafdehi. View their associated corruption and misconduct cases." />
        <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Public Entities | Jawafdehi Nepal" />
        <meta name="twitter:description" content="Explore profiles of Nepali public officials, politicians, and organizations tracked on Jawafdehi. View their associated corruption and misconduct cases." />
        <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
      </Helmet>

      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <section id="entities-intro" className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t("entities.title")}</h1>
            <p className="text-muted-foreground">{t("entities.description")}</p>
          </section>

          <Card id="entity-search-section" className="mb-8">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative flex-1">
                  <label htmlFor="entity-search" className="sr-only">
                    {t("entities.searchPlaceholder")}
                  </label>
                  <Input
                    id="entity-search"
                    placeholder={t("entities.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                {searchQuery && (
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                      <Filter className="w-4 h-4 mr-2" />
                      {t("entities.reset")}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {loading && page === 1 ? t("entities.loading") : (
                debouncedSearchQuery
                  ? t("entities.entitiesFound", { count: filteredEntities.length })
                  : t("entities.showing", { count: allEntities.length, total: data?.count ?? 0 })
              )}
            </p>
          </div>

          <section id="entity-results">
          {loading && page === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex gap-4 mb-4">
                      <Skeleton className="w-16 h-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEntities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">{t("entities.noEntitiesFound")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEntities.map(({ jawafEntity, nesEntity }, idx) => (
                  <EntityCard key={jawafEntity.nes_id ?? `entity-${idx}`} entity={nesEntity} jawafEntity={jawafEntity} />
                ))}
              </div>
              {!debouncedSearchQuery && data?.hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={loading}
                    variant="outline"
                    size="lg"
                  >
                    {loading ? t("entities.loadingMore") : t("entities.loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
          </section>
        </div>
      </main>

    </div>
  );
};

export default Entities;
