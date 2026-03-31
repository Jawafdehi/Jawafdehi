import { Footer } from "@/components/Footer";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import EntityCard from "@/components/EntityCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter } from "lucide-react";
import { getEntityById } from "@/services/api";
import { toast } from "sonner";
import axios from "axios";
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

interface JawafEntityPage {
  count: number;
  next: string | null;
  results: JawafEntity[];
}

const JDS_API_BASE_URL = () =>
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JDS_API_BASE_URL) ||
  'https://portal.jawafdehi.org/api';

const Entities = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    setSearchParams(params, { replace: true });
  }, [debouncedSearchQuery, setSearchParams]);

  const { data, isLoading: loading, isError } = useQuery({
    queryKey: ['jds-entities', page],
    queryFn: async () => {
      const response = await axios.get<JawafEntityPage>(
        `${JDS_API_BASE_URL()}/entities/`,
        { params: { page } }
      );
      const jawafEntities = response.data.results || [];

      const enriched: EnrichedEntity[] = await Promise.all(
        jawafEntities.map(async (jawafEntity) => {
          if (jawafEntity.nes_id) {
            try {
              const nesEntity = await getEntityById(jawafEntity.nes_id);
              return { jawafEntity, nesEntity };
            } catch {
              return { jawafEntity };
            }
          }
          return { jawafEntity };
        })
      );

      return {
        entities: enriched,
        count: response.data.count || 0,
        hasMore: response.data.next !== null,
      };
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Accumulate pages client-side
  const [allEntities, setAllEntities] = useState<EnrichedEntity[]>([]);
  useEffect(() => {
    if (!data) return;
    setAllEntities(prev => page === 1 ? data.entities : [...prev, ...data.entities]);
  }, [data, page]);

  useEffect(() => {
    if (isError) toast.error(t("entities.fetchError") || "Failed to load entities");
  }, [isError, t]);

  const filteredEntities = debouncedSearchQuery
    ? allEntities.filter(({ jawafEntity, nesEntity }) => {
        const query = debouncedSearchQuery.toLowerCase();
        if (jawafEntity.display_name?.toLowerCase().includes(query)) return true;
        if (jawafEntity.nes_id?.toLowerCase().includes(query)) return true;
        if (nesEntity?.names) {
          const en = nesEntity.names.find(n => n.en)?.en?.full?.toLowerCase() || '';
          const ne = nesEntity.names.find(n => n.ne)?.ne?.full?.toLowerCase() || '';
          if (en.includes(query) || ne.includes(query)) return true;
        }
        return false;
      })
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
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t("entities.title")}</h1>
            <p className="text-muted-foreground">{t("entities.description")}</p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="relative flex-1">
                  <Input
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
                {filteredEntities.map(({ jawafEntity, nesEntity }) => (
                  <EntityCard key={jawafEntity.id} entity={nesEntity} jawafEntity={jawafEntity} />
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
        </div>
      </main>

      <Footer />


    </div>
  );
};

export default Entities;
