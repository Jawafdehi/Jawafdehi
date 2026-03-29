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
import { getEntityById, Entity } from "@/services/api";
import { toast } from "sonner";
import axios from "axios";
import type { JawafEntity } from "@/types/jds";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Combined entity type with NES data
interface EnrichedEntity {
  jawafEntity: JawafEntity;
  nesEntity?: Entity;
}

const Entities = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entities, setEntities] = useState<EnrichedEntity[]>([]);
  const [allEntities, setAllEntities] = useState<EnrichedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);


  // Update URL params when search changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    setSearchParams(params, { replace: true });
  }, [debouncedSearchQuery, setSearchParams]);

  // Fetch entities from JDS API with pagination
  useEffect(() => {
    const fetchEntities = async (pageNum: number) => {
      if (pageNum === 1) {
        setLoading(true);
        setAllEntities([]);
      } else {
        setLoadingMore(true);
      }

      try {
        const JDS_API_BASE_URL = import.meta.env.VITE_JDS_API_BASE_URL || 'https://portal.jawafdehi.org/api';

        // Fetch JawafEntities from JDS API with pagination
        const response = await axios.get<{ count: number; next: string | null; results: JawafEntity[] }>(
          `${JDS_API_BASE_URL}/entities/`,
          { params: { page: pageNum } }
        );

        const jawafEntities = response.data.results || [];
        const count = response.data.count || 0;
        const hasNext = response.data.next !== null;

        console.log(`Fetched ${jawafEntities.length} entities from JDS (page ${pageNum})`);

        // TODO: Implement batch NES API endpoint to fetch multiple entities at once
        // For now, fetch NES data one at a time for entities with nes_id
        const enrichedEntities: EnrichedEntity[] = await Promise.all(
          jawafEntities.map(async (jawafEntity) => {
            if (jawafEntity.nes_id) {
              try {
                const nesEntity = await getEntityById(jawafEntity.nes_id);
                return { jawafEntity, nesEntity };
              } catch (error) {
                console.warn(`Failed to fetch NES data for ${jawafEntity.nes_id}:`, error);
                return { jawafEntity };
              }
            }
            return { jawafEntity };
          })
        );

        // Append to existing entities
        setAllEntities(prev => pageNum === 1 ? enrichedEntities : [...prev, ...enrichedEntities]);
        setTotalCount(count);
        setHasMore(hasNext);
      } catch (error) {
        console.error("Failed to fetch entities:", error);
        toast.error(t("entities.fetchError") || "Failed to load entities");
        if (pageNum === 1) {
          setAllEntities([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchEntities(page);
  }, [page, t]);

  // Apply search filter when search query or entities change
  useEffect(() => {
    // Client-side search filtering
    let filtered = allEntities;
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = allEntities.filter(({ jawafEntity, nesEntity }) => {
        // Search in display_name
        if (jawafEntity.display_name?.toLowerCase().includes(query)) return true;
        // Search in nes_id
        if (jawafEntity.nes_id?.toLowerCase().includes(query)) return true;
        // Search in NES entity names if available
        if (nesEntity?.names) {
          const nameEn = nesEntity.names.find(n => n.en)?.en?.full?.toLowerCase() || '';
          const nameNe = nesEntity.names.find(n => n.ne)?.ne?.full?.toLowerCase() || '';
          if (nameEn.includes(query) || nameNe.includes(query)) return true;
        }
        return false;
      });
    }

    // Sort alphabetically by display name or nes_id
    const sorted = [...filtered].sort((a, b) => {
      const nameA = a.jawafEntity.display_name || a.jawafEntity.nes_id || '';
      const nameB = b.jawafEntity.display_name || b.jawafEntity.nes_id || '';
      return nameA.localeCompare(nameB);
    });

    setEntities(sorted);
  }, [allEntities, debouncedSearchQuery]);


  const handleReset = () => {
    setSearchQuery("");
    setSearchParams(new URLSearchParams());
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Entities | Jawafdehi</title>
        <meta name="description" content={t("entities.hero.description")} />
      </Helmet>
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t("entities.title")}</h1>
            <p className="text-muted-foreground">
              {t("entities.description")}
            </p>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Input
                    placeholder={t("entities.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Reset Button */}
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

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {loading ? t("entities.loading") : (
                debouncedSearchQuery
                  ? t("entities.entitiesFound", { count: entities.length })
                  : t("entities.showing", { count: allEntities.length, total: totalCount })
              )}
            </p>
          </div>

          {/* Entity Grid */}
          {loading ? (
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
          ) : entities.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
                  {t("entities.noEntitiesFound")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {entities.map(({ jawafEntity, nesEntity }) => (
                  <EntityCard
                    key={jawafEntity.id}
                    entity={nesEntity}
                    jawafEntity={jawafEntity}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {!debouncedSearchQuery && hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    variant="outline"
                    size="lg"
                  >
                    {loadingMore ? t("entities.loadingMore") : t("entities.loadMore")}
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
