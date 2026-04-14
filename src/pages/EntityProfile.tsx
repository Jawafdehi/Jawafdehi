import { useEffect, useRef } from "react";
import { Footer } from "@/components/Footer";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { EntityDetailContainer } from "@/components/EntityDetailContainer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { JawafEntity } from "@/types/jds";
import { trackEvent } from "@/utils/analytics";

const JDS_API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JDS_API_BASE_URL) ||
  'https://portal.jawafdehi.org/api';

export default function EntityProfile() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const { id: encodedId } = useParams();
  const trackedEntityIdRef = useRef<string | null>(null);

  const numericId = encodedId ? parseInt(decodeURIComponent(encodedId), 10) : NaN;
  const validId = !isNaN(numericId);

  const { data: jawafEntity, isLoading, isError } = useQuery({
    queryKey: ['jds-entity', numericId],
    queryFn: async () => {
      const res = await axios.get<JawafEntity>(`${JDS_API_BASE_URL}/entities/${numericId}/`);
      return res.data;
    },
    enabled: validId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Track entity view event when entity data is loaded
  useEffect(() => {
    const entityId = jawafEntity?.id?.toString();
    if (!entityId || trackedEntityIdRef.current === entityId) {
      return;
    }

    trackEvent('entity_view', {
      entity_type: jawafEntity.type || 'unknown',
      entity_id: entityId,
      slug: `/entity/${encodedId}`,
    });
    trackedEntityIdRef.current = entityId;
  }, [jawafEntity, encodedId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {jawafEntity && (() => {
        const isNepali = currentLang === 'ne';
        const entityName = jawafEntity.display_name || '';
        const pageTitle = isNepali
          ? `${entityName} भ्रष्टाचारका मुद्धाहरु | जवाफदेही`
          : `${entityName} - Corruption Cases | Jawafdehi`;
        const pageDescription = isNepali
          ? `${entityName} सँग सम्बन्धित भ्रष्टाचारका मुद्दाहरू हेर्नुहोस् — जवाफदेही नेपालको खुला जवाफदेहिता डेटाबेस।`
          : `View corruption cases and allegations involving ${entityName} on Jawafdehi — Nepal's open accountability database.`;
        const canonicalUrl = `https://jawafdehi.org/entity/${jawafEntity.id}`;
        return (
          <Helmet>
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />
            <link rel="canonical" href={canonicalUrl} />
            <meta property="og:site_name" content="Jawafdehi Nepal" />
            <meta property="og:type" content="profile" />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:image" content="https://jawafdehi.org/og-favicon.png" />
            <meta property="og:locale" content={isNepali ? 'ne_NP' : 'en_US'} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content="https://jawafdehi.org/og-favicon.png" />
            <link rel="alternate" type="application/json" href={`https://portal.jawafdehi.org/api/entities/${jawafEntity.id}/`} title="Entity data (JSON API)" />
          </Helmet>
        );
      })()}
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/entities">{t("entityProfile.backToEntities")}</Link>
        </Button>

        {!validId ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("entityProfile.invalidEntityId")}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : isError || !jawafEntity ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t("entityProfile.entityNotFound")}</AlertDescription>
          </Alert>
        ) : (
          <EntityDetailContainer
            entityId={jawafEntity.nes_id || undefined}
            jawafEntityId={jawafEntity.id}
            jawafEntityName={jawafEntity.display_name}
            hasNesData={!!jawafEntity.nes_id}
            relatedCaseEntries={jawafEntity.related_cases || []}
          />
        )}
      </main>

      <Footer />


    </div>
  );
}
